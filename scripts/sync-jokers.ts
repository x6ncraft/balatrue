import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { format, resolveConfig } from 'prettier'

import {
  JOKER_CLASSIFICATION_VERSION,
  JOKER_DATA_GAME_VERSION,
  type Joker,
  type JokerRarity,
  type WikiJokerActivation,
  type WikiJokerType,
} from '../src/data/types'
import {
  assertKnownJokerClassificationReferences,
  createJokerFromSource,
  type JokerSourceRecord,
} from './joker-data-model'
import { writePublicProvenance } from './public-provenance'

const WIKI_API = 'https://balatrowiki.org/api.php'
const WIKI_PAGE_URL = 'https://balatrowiki.org/w'
const remoteSyncAcknowledgement = 'BALATRUE_REMOTE_SYNC_ALLOWED'
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const imageDirectory = join(projectRoot, 'public/jokers')
const generatedFile = join(projectRoot, 'src/data/jokers.generated.ts')
const sourceReviewFile = join(projectRoot, 'data/upstream/jokers.wiki.generated.json')

interface WikiRevisionResponse {
  query: {
    pages: Array<{
      title: string
      revisions?: Array<{
        revid: number
        timestamp: string
        slots: { main: { content: string } }
      }>
    }>
  }
}

interface WikiParseResponse {
  parse: {
    revid: number
    text: string
  }
}

interface WikiImageResponse {
  query: {
    pages: Array<{
      title: string
      imageinfo?: Array<{
        width: number
        height: number
        url: string
        sha1: string
      }>
    }>
  }
}

interface LocalizationData {
  revision: number
  timestamp: string
  version: string
  names: Map<string, string>
}

interface SourceRow {
  number: number
  nameEn: string
  effectTextEn: string
  cost: number | null
  rarity: JokerRarity
  unlockRequirementEn: string
  wikiType: WikiJokerType
  wikiActivation: WikiJokerActivation
}

interface ImageSource {
  width: number
  height: number
  url: string
  sha1: string
}

interface SyncCandidate {
  joker: Joker
  audit: JokerSourceRecord
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Balatrue personal prototype data sync/0.1' },
      })
      if (response.ok) return response
      lastError = new Error(`${response.status} ${response.statusText}`)
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(`Failed to fetch ${url}`, { cause: lastError })
}

async function fetchJson<T>(url: string): Promise<T> {
  return (await (await fetchWithRetry(url)).json()) as T
}

function wikiApiUrl(parameters: Record<string, string>): string {
  const url = new URL(WIKI_API)
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value)
  return url.toString()
}

async function fetchLocalization(title: string): Promise<LocalizationData> {
  const response = await fetchJson<WikiRevisionResponse>(
    wikiApiUrl({
      action: 'query',
      prop: 'revisions',
      titles: title,
      rvprop: 'content|ids|timestamp',
      rvslots: 'main',
      format: 'json',
      formatversion: '2',
    }),
  )
  const page = response.query.pages[0]
  const revision = page?.revisions?.[0]
  invariant(page && revision, `Missing revision content for ${title}`)

  const names = new Map<string, string>()
  const namePattern = /\n\s+(j_[a-z0-9_]+)=\{\s*\n\s*name="((?:\\.|[^"])*)"/g
  for (const match of revision.slots.main.content.matchAll(namePattern)) {
    const id = match[1]
    const rawName = match[2]
    invariant(id && rawName, `Malformed Joker localization in ${title}`)
    const name = rawName.replaceAll('\\"', '"').replaceAll('\\\\', '\\')
    invariant(!names.has(id), `Duplicate localization key ${id} in ${title}`)
    names.set(id, name)
  }

  invariant(names.size === 150, `Expected 150 Joker names in ${title}, found ${names.size}`)
  const version = revision.slots.main.content.match(/^-- v:\s*([^\n]+)/)?.[1]?.trim()
  invariant(version, `Missing localization version in ${title}`)

  return {
    revision: revision.revid,
    timestamp: revision.timestamp,
    version,
    names,
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
}

function normalizeCell(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/(?:\.mw-parser-output [^{]+\{[^}]*\})+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function parseJokerTable(html: string): Promise<SourceRow[]> {
  const rawRows: string[][] = []
  let currentRow: string[] | undefined
  let currentCellIndex: number | undefined

  const transformed = new HTMLRewriter()
    .on('table.wikitable.sortable tbody tr', {
      element(element) {
        currentRow = []
        element.onEndTag(() => {
          if (currentRow?.length) rawRows.push(currentRow)
          currentRow = undefined
        })
      },
    })
    .on('table.wikitable.sortable tbody tr td', {
      element(element) {
        if (!currentRow) return
        currentCellIndex = currentRow.length
        currentRow.push('')
        element.onEndTag(() => {
          currentCellIndex = undefined
        })
      },
      text(textChunk) {
        if (!currentRow || currentCellIndex === undefined) return
        currentRow[currentCellIndex] += textChunk.text
      },
    })
    .transform(new Response(html))
  await transformed.text()

  invariant(rawRows.length === 150, `Expected 150 Joker table rows, found ${rawRows.length}`)

  const rarityMap: Record<string, JokerRarity> = {
    Common: 'common',
    Uncommon: 'uncommon',
    Rare: 'rare',
    Legendary: 'legendary',
  }
  const typeMap: Record<string, WikiJokerType> = {
    '+c': 'chips',
    '+m': 'mult',
    Xm: 'x_mult',
    '++': 'chips_and_mult',
    '!!': 'effect',
    '...': 'retrigger',
    '+$': 'economy',
  }
  const activationMap: Record<string, WikiJokerActivation> = {
    'Indep.': 'independent',
    'N/A': 'passive',
    '': 'passive',
    'On Scored': 'on_scored',
    'On Held': 'on_held',
    'On Blind Select': 'on_blind_select',
    'On Played': 'on_played',
    'On Discard': 'on_discard',
    'On Other Jokers': 'on_other_jokers',
    Mixed: 'mixed',
  }

  return rawRows.map((rawRow, index) => {
    invariant(rawRow.length === 8, `Joker table row ${index + 1} has ${rawRow.length} cells`)
    const cells = rawRow.map(normalizeCell)
    const number = Number(cells[0])
    const nameEn = cells[1]
    const effectTextEn = cells[2]
    const costCell = cells[3]
    const rarityText = cells[4]?.match(/(Common|Uncommon|Rare|Legendary)$/)?.[1]
    const unlockRequirementEn = cells[5]
    const typeText = cells[6]
    const activationText = cells[7]
    const rarity = rarityText ? rarityMap[rarityText] : undefined
    const wikiType = typeText ? typeMap[typeText] : undefined
    const wikiActivation = activationMap[activationText ?? '']

    invariant(
      Number.isInteger(number) && number === index + 1,
      `Invalid Joker number at row ${index + 1}`,
    )
    invariant(nameEn, `Missing English name at row ${index + 1}`)
    invariant(effectTextEn, `Missing effect text for ${nameEn}`)
    invariant(rarity, `Unknown rarity '${cells[4]}' for ${nameEn}`)
    invariant(wikiType, `Unknown wiki type '${typeText}' for ${nameEn}`)
    invariant(wikiActivation, `Unknown wiki activation '${activationText}' for ${nameEn}`)
    invariant(unlockRequirementEn, `Missing unlock requirement for ${nameEn}`)

    let cost: number | null = null
    if (costCell !== 'N/A') {
      const costMatch = costCell?.match(/^\$(\d+)$/)
      invariant(costMatch, `Invalid cost '${costCell}' for ${nameEn}`)
      cost = Number(costMatch[1])
    }

    return {
      number,
      nameEn,
      effectTextEn,
      cost,
      rarity,
      unlockRequirementEn,
      wikiType,
      wikiActivation,
    }
  })
}

async function fetchImages(): Promise<Map<string, ImageSource>> {
  const response = await fetchJson<WikiImageResponse>(
    wikiApiUrl({
      action: 'query',
      generator: 'categorymembers',
      gcmtitle: 'Category:Images - Jokers',
      gcmtype: 'file',
      gcmlimit: '500',
      prop: 'imageinfo',
      iiprop: 'url|size|sha1',
      format: 'json',
      formatversion: '2',
    }),
  )
  const images = new Map<string, ImageSource>()

  for (const page of response.query.pages) {
    if (!page.title.startsWith('File:') || !page.title.endsWith('.png')) continue
    const info = page.imageinfo?.[0]
    if (!info) continue
    const name = page.title.slice('File:'.length, -'.png'.length)
    images.set(name, info)
  }

  return images
}

function makeJoker(
  row: SourceRow,
  id: string,
  nameZhCN: string,
  image: ImageSource,
): SyncCandidate {
  const audit: JokerSourceRecord = {
    id,
    number: row.number,
    name: { en: row.nameEn, zhCN: nameZhCN },
    referencePageUrl: `${WIKI_PAGE_URL}/${encodeURIComponent(row.nameEn.replaceAll(' ', '_'))}`,
    effectTextEn: row.effectTextEn,
    unlockRequirementEn: row.unlockRequirementEn,
    cost: row.cost,
    rarity: row.rarity,
    wikiType: row.wikiType,
    wikiActivation: row.wikiActivation,
    imageUrl: image.url,
    imageSha1: image.sha1,
    imageWidth: image.width,
    imageHeight: image.height,
  }

  return { audit, joker: createJokerFromSource(audit, '') }
}

async function sha1File(path: string): Promise<string> {
  return createHash('sha1')
    .update(await readFile(path))
    .digest('hex')
}

async function reuseVerifiedLocalHashes(jokers: Joker[]): Promise<void> {
  if (!existsSync(generatedFile)) return

  try {
    const generatedUrl = pathToFileURL(generatedFile)
    generatedUrl.searchParams.set('cacheBust', String(Date.now()))
    const previous = (await import(generatedUrl.href)) as { jokers?: readonly Joker[] }
    const previousById = new Map(previous.jokers?.map((joker) => [joker.id, joker]) ?? [])

    for (const joker of jokers) {
      const cached = previousById.get(joker.id)
      if (cached?.source.imageSha1 === joker.source.imageSha1) {
        joker.source.localImageSha1 = cached.source.localImageSha1
      }
    }
  } catch {
    console.warn('[data] previous generated file could not be loaded; images will be reverified')
  }
}

async function syncImage(joker: Joker, imageUrl: string): Promise<'downloaded' | 'cached'> {
  const path = join(projectRoot, 'public', joker.imagePath)
  if (
    joker.source.localImageSha1 &&
    existsSync(path) &&
    (await sha1File(path)) === joker.source.localImageSha1
  ) {
    return 'cached'
  }

  const response = await fetchWithRetry(imageUrl)
  const bytes = Buffer.from(await response.arrayBuffer())
  const sha1 = createHash('sha1').update(bytes).digest('hex')
  invariant(
    bytes.subarray(1, 4).toString() === 'PNG',
    `Downloaded asset is not PNG for ${joker.name.en}`,
  )
  invariant(
    bytes.readUInt32BE(16) === joker.source.imageWidth,
    `Image width mismatch for ${joker.name.en}`,
  )
  invariant(
    bytes.readUInt32BE(20) === joker.source.imageHeight,
    `Image height mismatch for ${joker.name.en}`,
  )
  joker.source.localImageSha1 = sha1
  if (existsSync(path) && (await sha1File(path)) === sha1) return 'cached'

  await writeFile(path, bytes)
  return 'downloaded'
}

async function main(): Promise<void> {
  invariant(
    process.env[remoteSyncAcknowledgement] === '1',
    `[data] remote sync is maintainer-only; confirm source access permission, then set ${remoteSyncAcknowledgement}=1`,
  )
  console.log('[data] fetching official localization names and current Wiki facts')
  const [enLocalization, zhCNLocalization, parsedPage, imageSources] = await Promise.all([
    fetchLocalization('Module:Localization/en-us'),
    fetchLocalization('Module:Localization/zh-cn'),
    fetchJson<WikiParseResponse>(
      wikiApiUrl({
        action: 'parse',
        page: 'Jokers',
        prop: 'text|revid',
        format: 'json',
        formatversion: '2',
      }),
    ),
    fetchImages(),
  ])
  const rows = await parseJokerTable(parsedPage.parse.text)

  const enIdsByName = new Map<string, string>()
  for (const [id, name] of enLocalization.names) {
    invariant(!enIdsByName.has(name), `Duplicate English Joker name '${name}'`)
    enIdsByName.set(name, id)
  }

  const candidates = rows.map((row) => {
    const id = enIdsByName.get(row.nameEn)
    invariant(id, `Joker table name '${row.nameEn}' is absent from official English localization`)
    const nameZhCN = zhCNLocalization.names.get(id)
    invariant(nameZhCN, `Missing in-game zh-CN localization for ${id}`)
    const image = imageSources.get(row.nameEn)
    invariant(image, `Missing official Wiki image for ${row.nameEn}`)
    return makeJoker(row, id, nameZhCN, image)
  })
  const jokers = candidates.map(({ joker }) => joker)

  invariant(new Set(jokers.map((joker) => joker.id)).size === 150, 'Joker IDs are not unique')
  const jokerIds = new Set(jokers.map((joker) => joker.id))
  assertKnownJokerClassificationReferences(jokerIds)
  invariant(
    new Set(jokers.map((joker) => joker.name.en)).size === 150,
    'English Joker names are not unique',
  )
  invariant(
    new Set(jokers.map((joker) => joker.name.zhCN)).size === 150,
    'zh-CN Joker names are not unique',
  )

  await mkdir(imageDirectory, { recursive: true })
  await reuseVerifiedLocalHashes(jokers)
  let downloaded = 0
  for (let start = 0; start < candidates.length; start += 10) {
    const results = await Promise.all(
      candidates
        .slice(start, start + 10)
        .map(({ joker, audit }) => syncImage(joker, audit.imageUrl)),
    )
    downloaded += results.filter((result) => result === 'downloaded').length
    console.log(`[data] images ${Math.min(start + 10, jokers.length)}/${jokers.length}`)
  }

  const metadata = {
    gameVersion: JOKER_DATA_GAME_VERSION,
    classificationVersion: JOKER_CLASSIFICATION_VERSION,
    source: {
      wikiPageUrl: `${WIKI_PAGE_URL}/Jokers?oldid=${parsedPage.parse.revid}`,
      wikiPageRevision: parsedPage.parse.revid,
      enLocalizationUrl: `${WIKI_PAGE_URL}/Module:Localization/en-us?oldid=${enLocalization.revision}`,
      enLocalizationRevision: enLocalization.revision,
      enLocalizationTimestamp: enLocalization.timestamp,
      enLocalizationVersion: enLocalization.version,
      zhCNLocalizationUrl: `${WIKI_PAGE_URL}/Module:Localization/zh-cn?oldid=${zhCNLocalization.revision}`,
      zhCNLocalizationRevision: zhCNLocalization.revision,
      zhCNLocalizationTimestamp: zhCNLocalization.timestamp,
      zhCNLocalizationVersion: zhCNLocalization.version,
    },
  }
  const generated = `// Generated by scripts/sync-jokers.ts. Do not edit by hand.\nimport type { Joker, JokerDataMeta } from './types'\n\nexport const JOKER_DATA_META: JokerDataMeta = ${JSON.stringify(metadata, null, 2)}\n\nexport const jokers: readonly Joker[] = ${JSON.stringify(jokers, null, 2)}\n`
  const prettierConfig = (await resolveConfig(generatedFile)) ?? {}
  await writeFile(
    generatedFile,
    await format(generated, { ...prettierConfig, parser: 'typescript' }),
  )
  await mkdir(dirname(sourceReviewFile), { recursive: true })
  await writeFile(
    sourceReviewFile,
    `${JSON.stringify(
      {
        schemaVersion: 2,
        distribution: 'upstream-source-review-data',
        capturedAt: new Date().toISOString(),
        licenseNotice: {
          spdx: 'NOASSERTION',
          projectLicense: 'Excluded from the root MIT license',
          source: 'Balatro Wiki',
          sourceUrl: 'https://balatrowiki.org/w/Jokers',
          attribution: 'Balatro Wiki contributors',
          sourceLicenseNotice: 'CC BY-NC-SA 3.0; additional terms may apply',
          sourceLicenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/3.0/',
          modifications:
            'MediaWiki presentation markup removed; whitespace and rendered variable values normalized to JSON.',
          rights:
            'Some short wording may originate in Balatro. All underlying rights remain with their respective rights holders.',
          details: 'See data/upstream/README.md and ASSET_NOTICE.md.',
        },
        generatedBy: 'scripts/sync-jokers.ts',
        metadata,
        jokers: candidates.map(({ audit }) => audit),
      },
      null,
      2,
    )}\n`,
  )
  await writePublicProvenance(
    metadata,
    jokers,
    candidates.map(({ audit }) => audit),
  )
  console.log(`[data] wrote ${jokers.length} Jokers; downloaded ${downloaded} image(s)`)
}

if (import.meta.main) await main()

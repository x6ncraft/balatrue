import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { format, resolveConfig } from 'prettier'

import {
  JOKER_CLASSIFICATION_VERSION,
  JOKER_DATA_GAME_VERSION,
  JOKER_DEPENDENCY_FAMILIES,
  JOKER_EFFECTS,
  JOKER_TIMINGS,
  type Joker,
  type JokerDependency,
  type JokerEffect,
  type JokerRarity,
  type JokerTiming,
  type WikiJokerActivation,
  type WikiJokerType,
} from '../src/data/types'

const WIKI_API = 'https://balatrowiki.org/api.php'
const WIKI_PAGE_URL = 'https://balatrowiki.org/wiki'
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const imageDirectory = join(projectRoot, 'public/jokers')
const generatedFile = join(projectRoot, 'src/data/jokers.generated.ts')

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

function classifyEffects(wikiType: WikiJokerType, text: string): JokerEffect[] {
  const effects = new Set<JokerEffect>()
  const baseEffects: Record<WikiJokerType, readonly JokerEffect[]> = {
    chips: ['chips'],
    mult: ['mult'],
    x_mult: ['x_mult'],
    chips_and_mult: ['chips', 'mult'],
    economy: ['economy'],
    retrigger: ['retrigger'],
    effect: ['mechanism'],
  }
  for (const effect of baseEffects[wikiType]) effects.add(effect)

  if (/retrigger/i.test(text)) effects.add('retrigger')

  return JOKER_EFFECTS.filter((effect) => effects.has(effect))
}

function classifyTimings(activation: WikiJokerActivation, text: string): JokerTiming[] {
  const timings = new Set<JokerTiming>()
  const baseTiming: Record<WikiJokerActivation, JokerTiming> = {
    independent: 'hand_scored',
    passive: 'passive',
    on_scored: 'card_scored',
    on_held: 'card_held',
    on_blind_select: 'blind_selected',
    on_played: 'card_played',
    on_discard: 'card_discarded',
    on_other_jokers: 'joker_triggered',
    mixed: 'mixed',
  }
  timings.add(baseTiming[activation])

  const eventRules: Array<[RegExp, JokerTiming]> = [
    [/when (?:a )?played card is scored|played cards? with|cards? scored/i, 'card_scored'],
    [/held in hand/i, 'card_held'],
    [/when blind is selected|blind is selected/i, 'blind_selected'],
    [/when.*discard|discarded cards?/i, 'card_discarded'],
    [/after.*hand played|when hand is played|first hand of round/i, 'card_played'],
    [/end of (?:the )?round/i, 'round_end'],
    [/per round(?: played)?|each round/i, 'round_end'],
    [/end of (?:the )?shop|leaving the shop/i, 'shop'],
    [/when (?:this joker is )?sold|sell this card/i, 'sold'],
  ]
  let foundSpecificEvent = false
  for (const [pattern, timing] of eventRules) {
    if (!pattern.test(text)) continue
    foundSpecificEvent = true
    timings.add(timing)
  }

  if (activation === 'mixed' && foundSpecificEvent) timings.delete('mixed')
  if (activation === 'passive' && foundSpecificEvent) timings.delete('passive')
  return JOKER_TIMINGS.filter((timing) => timings.has(timing))
}

function classifyDependencies(text: string): JokerDependency[] {
  const dependencies = new Map<string, JokerDependency>()
  const add = (family: JokerDependency['family'], value?: string) => {
    dependencies.set(`${family}:${value ?? ''}`, value ? { family, value } : { family })
  }

  const suits: Array<[RegExp, string]> = [
    [/\bDiamonds?\b/i, 'diamonds'],
    [/\bHearts?\b/i, 'hearts'],
    [/\bSpades?\b/i, 'spades'],
    [/\bClubs?\b/i, 'clubs'],
  ]
  for (const [pattern, value] of suits) if (pattern.test(text)) add('suit', value)
  if (
    /\bsuit\b/i.test(text) &&
    !dependencies.has('suit:diamonds') &&
    !dependencies.has('suit:hearts') &&
    !dependencies.has('suit:spades') &&
    !dependencies.has('suit:clubs')
  )
    add('suit', 'any')

  const ranks: Array<[RegExp, string]> = [
    [/\bAces?\b/i, 'ace'],
    [/\bKings?\b/i, 'king'],
    [/\bQueens?\b/i, 'queen'],
    [/\bJacks?\b/i, 'jack'],
    [/\bface cards?\b/i, 'face'],
    [/\beven ranked\b/i, 'even'],
    [/\bodd ranked\b/i, 'odd'],
    [/\bplayed 2s?\b/i, '2'],
    [/\bplayed 3s?\b/i, '3'],
    [/\bplayed 4s?\b/i, '4'],
    [/\bplayed 5s?\b/i, '5'],
    [/\bplayed 6s?\b/i, '6'],
    [/\bplayed 7s?\b/i, '7'],
    [/\bplayed 8s?\b/i, '8'],
    [/\bplayed 9s?\b/i, '9'],
    [/\bplayed 10s?\b/i, '10'],
  ]
  for (const [pattern, value] of ranks) if (pattern.test(text)) add('rank', value)
  if (/\brank\b/i.test(text) && ![...dependencies.values()].some((tag) => tag.family === 'rank'))
    add('rank', 'any')

  const pokerHands: Array<[RegExp, string]> = [
    [/\bFlush Five\b/i, 'flush_five'],
    [/\bFlush House\b/i, 'flush_house'],
    [/\bFive of a Kind\b/i, 'five_of_a_kind'],
    [/\bFour of a Kind\b/i, 'four_of_a_kind'],
    [/\bFull House\b/i, 'full_house'],
    [/\bThree of a Kind\b/i, 'three_of_a_kind'],
    [/\bTwo Pair\b/i, 'two_pair'],
    [/\bHigh Card\b/i, 'high_card'],
    [/\bStraight(?:s)?\b/i, 'straight'],
    [/\bFlush(?:es)?\b/i, 'flush'],
    [/\bPair\b/i, 'pair'],
  ]
  for (const [pattern, value] of pokerHands) if (pattern.test(text)) add('poker_hand', value)
  if (
    /\bpoker hand\b/i.test(text) &&
    ![...dependencies.values()].some((tag) => tag.family === 'poker_hand')
  )
    add('poker_hand', 'any')

  if (
    /playing cards?|played cards?|card is scored|cards? scored|card added to your deck|destroy.*card/i.test(
      text,
    )
  )
    add('playing_card')
  if (
    /enhanced cards?|Bonus Card|Mult Card|Wild Card|Glass Card|Steel Card|Stone Card|Gold Card|Lucky Card/i.test(
      text,
    )
  )
    add('card_modifier', 'enhancement')
  if (/\bedition\b|Negative|Foil|Holographic|Polychrome/i.test(text))
    add('card_modifier', 'edition')
  if (/\bseal\b/i.test(text)) add('card_modifier', 'seal')
  if (
    /(?:if|when|while).{0,30}(?:\$\d+|money)|money held|sell value|(?:per|every) \$|based on.{0,20}money|\$\d+ or (?:less|more)|at most \$|interest|debt/i.test(
      text,
    )
  )
    add('money')
  if (
    /other Jokers?|random Joker|each Joker|owned Jokers?|Joker to the (?:left|right)|copies ability/i.test(
      text,
    )
  )
    add('joker')
  if (/Joker slots?|Joker slot/i.test(text)) add('joker_slot')
  if (/\bTarot\b/i.test(text)) add('consumable', 'tarot')
  if (/\bPlanet\b/i.test(text)) add('consumable', 'planet')
  if (/\bSpectral\b|Soul card/i.test(text)) add('consumable', 'spectral')
  if (/\bconsumable\b/i.test(text)) add('consumable', 'any')
  if (/\bdiscard/i.test(text)) add('discard')
  if (/\bhand size\b/i.test(text)) add('hand', 'hand_size')
  if (/hands? remaining|hands? per round|[+-]\d+ hands? each round/i.test(text))
    add('hand', 'hands_per_round')
  if (/played hand contains \d+ or fewer cards/i.test(text)) add('hand', 'card_count')
  if (/\bhand played\b/i.test(text)) add('hand', 'played_hands')
  if (/per round(?: played)?|each round/i.test(text)) add('round')
  if (/\bBlind\b/i.test(text)) add('blind')
  if (/\bshop\b|Booster Pack|reroll/i.test(text)) add('shop')
  if (/\bdeck\b/i.test(text)) add('deck')

  if (dependencies.size === 0) add('none')
  const familyOrder = new Map(JOKER_DEPENDENCY_FAMILIES.map((family, index) => [family, index]))
  return [...dependencies.values()].sort((left, right) => {
    const familyDifference =
      (familyOrder.get(left.family) ?? 0) - (familyOrder.get(right.family) ?? 0)
    return familyDifference || (left.value ?? '').localeCompare(right.value ?? '', 'en')
  })
}

function makeJoker(row: SourceRow, id: string, nameZhCN: string, image: ImageSource): Joker {
  const legendary = row.rarity === 'legendary'
  return {
    id,
    number: row.number,
    name: { en: row.nameEn, zhCN: nameZhCN },
    imagePath: `/jokers/${id}.png`,
    official: {
      gameVersion: JOKER_DATA_GAME_VERSION,
      rarity: row.rarity,
      cost: row.cost,
      shopPurchasable: !legendary,
    },
    source: {
      wikiPageUrl: `${WIKI_PAGE_URL}/${encodeURIComponent(row.nameEn.replaceAll(' ', '_'))}`,
      effectTextEn: row.effectTextEn,
      unlockRequirementEn: row.unlockRequirementEn,
      wikiType: row.wikiType,
      wikiActivation: row.wikiActivation,
      imageUrl: image.url,
      imageSha1: image.sha1,
      localImageSha1: '',
      imageWidth: image.width,
      imageHeight: image.height,
    },
    classification: {
      version: JOKER_CLASSIFICATION_VERSION,
      acquisition: {
        kind: legendary ? 'soul' : 'shop',
        unlockState: legendary
          ? 'legendary'
          : row.unlockRequirementEn === 'Available from start.'
            ? 'starting'
            : 'unlock_required',
      },
      effects: classifyEffects(row.wikiType, row.effectTextEn),
      timings: classifyTimings(row.wikiActivation, row.effectTextEn),
      dependencies: classifyDependencies(row.effectTextEn),
    },
  }
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

async function syncImage(joker: Joker): Promise<'downloaded' | 'cached'> {
  const path = join(projectRoot, 'public', joker.imagePath)
  if (
    joker.source.localImageSha1 &&
    existsSync(path) &&
    (await sha1File(path)) === joker.source.localImageSha1
  ) {
    return 'cached'
  }

  const response = await fetchWithRetry(joker.source.imageUrl)
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

  const jokers = rows.map((row) => {
    const id = enIdsByName.get(row.nameEn)
    invariant(id, `Joker table name '${row.nameEn}' is absent from official English localization`)
    const nameZhCN = zhCNLocalization.names.get(id)
    invariant(nameZhCN, `Missing official zh-CN localization for ${id}`)
    const image = imageSources.get(row.nameEn)
    invariant(image, `Missing official Wiki image for ${row.nameEn}`)
    return makeJoker(row, id, nameZhCN, image)
  })

  invariant(new Set(jokers.map((joker) => joker.id)).size === 150, 'Joker IDs are not unique')
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
  for (let start = 0; start < jokers.length; start += 10) {
    const results = await Promise.all(jokers.slice(start, start + 10).map(syncImage))
    downloaded += results.filter((result) => result === 'downloaded').length
    console.log(`[data] images ${Math.min(start + 10, jokers.length)}/${jokers.length}`)
  }

  const metadata = {
    gameVersion: JOKER_DATA_GAME_VERSION,
    classificationVersion: JOKER_CLASSIFICATION_VERSION,
    source: {
      wikiPageRevision: parsedPage.parse.revid,
      enLocalizationRevision: enLocalization.revision,
      enLocalizationTimestamp: enLocalization.timestamp,
      enLocalizationVersion: enLocalization.version,
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
  console.log(`[data] wrote ${jokers.length} Jokers; downloaded ${downloaded} image(s)`)
}

await main()

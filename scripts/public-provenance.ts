import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import type { Joker, JokerDataMeta, WikiJokerActivation, WikiJokerType } from '../src/data/types'
import type { JokerSourceRecord } from './joker-data-model'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const outputFile = join(projectRoot, 'data/jokers.provenance.generated.json')
const sourceReviewFile = join(projectRoot, 'data/upstream/jokers.wiki.generated.json')
const generatedFile = join(projectRoot, 'src/data/jokers.generated.ts')

export type ProvenanceSourceRecord = Pick<
  JokerSourceRecord,
  'id' | 'number' | 'name' | 'referencePageUrl' | 'imageUrl' | 'imageSha1'
>

interface SourceReviewFile {
  schemaVersion: number
  metadata: JokerDataMeta
  jokers: ProvenanceSourceRecord[]
}

function imageDescriptionPageUrl(imageUrl: string): string {
  const fileName = decodeURIComponent(new URL(imageUrl).pathname.split('/').at(-1) ?? '')
  if (!fileName) throw new Error(`[data] invalid image source URL: ${imageUrl}`)
  return `https://balatrowiki.org/w/File:${encodeURIComponent(fileName)}`
}

export function createPublicProvenance(
  metadata: JokerDataMeta,
  jokers: readonly Joker[],
  sources: readonly ProvenanceSourceRecord[],
) {
  const sourceById = new Map(sources.map((record) => [record.id, record]))
  const records = jokers.map((joker) => {
    const source = sourceById.get(joker.id)
    if (!source) throw new Error(`[data] missing provenance source for ${joker.id}`)

    return {
      id: joker.id,
      number: joker.number,
      name: joker.name,
      referencePageUrl: source.referencePageUrl,
      imageDescriptionPageUrl: imageDescriptionPageUrl(source.imageUrl),
      imageSourceUrl: source.imageUrl,
      sourceImageSha1: source.imageSha1,
      localImageSha1: joker.source.localImageSha1,
      imageWidth: joker.source.imageWidth,
      imageHeight: joker.source.imageHeight,
      effectTextSha256: joker.source.effectTextSha256,
      unlockRequirementSha256: joker.source.unlockRequirementSha256,
      wikiType: joker.source.wikiType as WikiJokerType,
      wikiActivation: joker.source.wikiActivation as WikiJokerActivation,
    }
  })

  return {
    schemaVersion: 1,
    generatedBy: 'scripts/sync-jokers.ts',
    rightsNotice:
      'Balatro names and Joker artwork belong to their respective rights holders and are excluded from the project MIT license. See ASSET_NOTICE.md.',
    metadata,
    jokers: records,
  }
}

export async function writePublicProvenance(
  metadata: JokerDataMeta,
  jokers: readonly Joker[],
  sources: readonly ProvenanceSourceRecord[],
): Promise<void> {
  await mkdir(dirname(outputFile), { recursive: true })
  await writeFile(
    outputFile,
    `${JSON.stringify(createPublicProvenance(metadata, jokers, sources), null, 2)}\n`,
  )
}

async function main(): Promise<void> {
  if (!existsSync(sourceReviewFile)) {
    throw new Error('[data] checked-in source-review data is required to regenerate provenance')
  }

  const sourceReview = JSON.parse(await readFile(sourceReviewFile, 'utf8')) as SourceReviewFile
  if (sourceReview.schemaVersion !== 2) {
    throw new Error(`[data] expected source-review schema 2, found ${sourceReview.schemaVersion}`)
  }
  const generatedUrl = pathToFileURL(generatedFile)
  generatedUrl.searchParams.set('cacheBust', String(Date.now()))
  const generated = (await import(generatedUrl.href)) as {
    JOKER_DATA_META: JokerDataMeta
    jokers: readonly Joker[]
  }

  await writePublicProvenance(generated.JOKER_DATA_META, generated.jokers, sourceReview.jokers)
  console.log(`[data] wrote public provenance for ${generated.jokers.length} Jokers`)
}

if (import.meta.main) await main()

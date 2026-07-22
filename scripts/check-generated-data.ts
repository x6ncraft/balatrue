import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { JOKER_DATA_META, jokers } from '../src/data/jokers.generated'
import type { Joker, JokerDataMeta } from '../src/data/types'
import { JOKER_SEARCH_ALIASES } from '../src/search/joker-search.generated'
import { generateClassificationReviewReport } from './classification-review-report'
import {
  generateJokerSearchAliases,
  type GeneratedJokerSearchAliases,
} from './generate-joker-search'
import {
  assertKnownJokerClassificationReferences,
  createJokerFromSource,
  type JokerSourceRecord,
} from './joker-data-model'
import { createPublicProvenance } from './public-provenance'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const sourceReviewFile = join(projectRoot, 'data/upstream/jokers.wiki.generated.json')
const provenanceFile = join(projectRoot, 'data/jokers.provenance.generated.json')
const classificationReviewFile = join(projectRoot, 'docs/classification-review.generated.md')

export interface SourceReviewFile {
  schemaVersion: number
  metadata: JokerDataMeta
  jokers: JokerSourceRecord[]
}

export interface GeneratedArtifacts {
  metadata: JokerDataMeta
  jokers: readonly Joker[]
  searchAliases: GeneratedJokerSearchAliases
  provenance: ReturnType<typeof createPublicProvenance>
  classificationReviewReport: string
}

function firstDifference(actual: unknown, expected: unknown, path: string): string | undefined {
  if (Object.is(actual, expected)) return undefined
  if (typeof actual !== typeof expected || actual === null || expected === null) return path
  if (typeof actual !== 'object') return path

  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) {
      return `${path}.length`
    }
    for (let index = 0; index < actual.length; index += 1) {
      const difference = firstDifference(actual[index], expected[index], `${path}[${index}]`)
      if (difference) return difference
    }
    return undefined
  }

  const actualRecord = actual as Record<string, unknown>
  const expectedRecord = expected as Record<string, unknown>
  const keys = [...new Set([...Object.keys(actualRecord), ...Object.keys(expectedRecord)])].sort()
  for (const key of keys) {
    if (!(key in actualRecord) || !(key in expectedRecord)) return `${path}.${key}`
    const difference = firstDifference(actualRecord[key], expectedRecord[key], `${path}.${key}`)
    if (difference) return difference
  }
  return undefined
}

function assertArtifactCurrent(label: string, actual: unknown, expected: unknown): void {
  const difference = firstDifference(actual, expected, label)
  if (difference) {
    throw new Error(`[data] generated ${label} is stale at ${difference}`)
  }
}

export function createExpectedGeneratedArtifacts(
  sourceReview: SourceReviewFile,
  localImageSha1ById: Readonly<Record<string, string>>,
): GeneratedArtifacts {
  if (sourceReview.schemaVersion !== 2) {
    throw new Error(`[data] expected source-review schema 2, found ${sourceReview.schemaVersion}`)
  }

  const jokerIds = new Set(sourceReview.jokers.map(({ id }) => id))
  assertKnownJokerClassificationReferences(jokerIds)
  const expectedJokers = sourceReview.jokers.map((source) => {
    const localImageSha1 = localImageSha1ById[source.id]
    if (!localImageSha1) throw new Error(`[data] missing local image digest for ${source.id}`)
    return createJokerFromSource(source, localImageSha1)
  })

  return {
    metadata: sourceReview.metadata,
    jokers: expectedJokers,
    searchAliases: generateJokerSearchAliases(expectedJokers),
    provenance: createPublicProvenance(sourceReview.metadata, expectedJokers, sourceReview.jokers),
    classificationReviewReport: generateClassificationReviewReport(expectedJokers),
  }
}

export function assertGeneratedArtifactsCurrent(
  actual: GeneratedArtifacts,
  expected: GeneratedArtifacts,
): void {
  assertArtifactCurrent('runtime metadata', actual.metadata, expected.metadata)
  assertArtifactCurrent('runtime Joker data', actual.jokers, expected.jokers)
  assertArtifactCurrent('search aliases', actual.searchAliases, expected.searchAliases)
  assertArtifactCurrent('public provenance', actual.provenance, expected.provenance)
  assertArtifactCurrent(
    'classification review report',
    actual.classificationReviewReport,
    expected.classificationReviewReport,
  )
}

async function main(): Promise<void> {
  const sourceReview = JSON.parse(await readFile(sourceReviewFile, 'utf8')) as SourceReviewFile
  const localImageSha1ById = Object.fromEntries(
    await Promise.all(
      sourceReview.jokers.map(async ({ id }) => [
        id,
        createHash('sha1')
          .update(await readFile(join(projectRoot, 'public/jokers', `${id}.png`)))
          .digest('hex'),
      ]),
    ),
  )
  const expected = createExpectedGeneratedArtifacts(sourceReview, localImageSha1ById)
  const provenance = JSON.parse(
    await readFile(provenanceFile, 'utf8'),
  ) as GeneratedArtifacts['provenance']
  const classificationReviewReport = await readFile(classificationReviewFile, 'utf8')

  assertGeneratedArtifactsCurrent(
    {
      metadata: JOKER_DATA_META,
      jokers,
      searchAliases: JOKER_SEARCH_ALIASES,
      provenance,
      classificationReviewReport,
    },
    expected,
  )
  console.log(
    `[data] generated artifacts match schema ${sourceReview.schemaVersion}, current inference rules, ${expected.jokers.length} local images, search aliases, public provenance, and the classification review report`,
  )
}

if (import.meta.main) await main()

// @vitest-environment node

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { beforeAll, describe, expect, it } from 'vitest'

import {
  assertGeneratedArtifactsCurrent,
  createExpectedGeneratedArtifacts,
  type GeneratedArtifacts,
  type SourceReviewFile,
} from './check-generated-data'

let sourceReview: SourceReviewFile
let expected: GeneratedArtifacts
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))

function clonedExpected(): GeneratedArtifacts {
  return structuredClone(expected) as GeneratedArtifacts
}

beforeAll(async () => {
  sourceReview = JSON.parse(
    await readFile(join(projectRoot, 'data/upstream/jokers.wiki.generated.json'), 'utf8'),
  ) as SourceReviewFile
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
  expected = createExpectedGeneratedArtifacts(sourceReview, localImageSha1ById)
})

describe('generated-data release gate', () => {
  it('keeps the generated-data gate ahead of Vite in the production build', async () => {
    const packageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>
    }
    const build = packageJson.scripts?.build ?? ''

    expect(build).toContain('bun run data:validate')
    expect(build.indexOf('bun run data:validate')).toBeLessThan(build.indexOf('vite build'))
  })

  it('accepts artifacts recreated from the checked-in source review', () => {
    expect(() => assertGeneratedArtifactsCurrent(clonedExpected(), expected)).not.toThrow()
  })

  it('rejects stale classifications after inference rules change', () => {
    const actual = clonedExpected()
    const castle = actual.jokers.find(({ id }) => id === 'j_castle')
    if (!castle) throw new Error('Missing Castle fixture')
    castle.classification.abilities = castle.classification.abilities.slice(0, -1)

    expect(() => assertGeneratedArtifactsCurrent(actual, expected)).toThrow(
      /generated runtime Joker data is stale/,
    )
  })

  it.each(['cost', 'rarity'] as const)('rejects stale %s data', (field) => {
    const actual = clonedExpected()
    const first = actual.jokers[0]
    if (!first) throw new Error('Missing Joker fixture')
    if (field === 'cost') first.official.cost = (first.official.cost ?? 0) + 1
    else first.official.rarity = 'uncommon'

    expect(() => assertGeneratedArtifactsCurrent(actual, expected)).toThrow(
      /generated runtime Joker data is stale/,
    )
  })

  it('rejects stale search aliases', () => {
    const actual = clonedExpected()
    ;(actual.searchAliases as Record<string, readonly [string, string]>).j_joker = [
      'stale',
      'stale',
    ]

    expect(() => assertGeneratedArtifactsCurrent(actual, expected)).toThrow(
      /generated search aliases is stale/,
    )
  })

  it('rejects stale public provenance', () => {
    const actual = clonedExpected()
    const first = actual.provenance.jokers[0]
    if (!first) throw new Error('Missing provenance fixture')
    first.referencePageUrl = 'https://balatrowiki.org/w/Stale'

    expect(() => assertGeneratedArtifactsCurrent(actual, expected)).toThrow(
      /generated public provenance is stale/,
    )
  })

  it('rejects a stale classification review report', () => {
    const actual = clonedExpected()
    actual.classificationReviewReport = actual.classificationReviewReport.replace(
      '能力数据模型第 12 版',
      '能力数据模型第 999 版',
    )

    expect(() => assertGeneratedArtifactsCurrent(actual, expected)).toThrow(
      /generated classification review report is stale/,
    )
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  CLASSIFICATION_REVIEW_CASE_IDS,
  CLASSIFICATION_REVIEW_CASE_IDS_BY_KIND,
  CLASSIFICATION_REVIEW_CASES,
} from './classification-review-cases'

const taxonomy = readFileSync(resolve('docs/clue-taxonomy.md'), 'utf8')

function idsInTaxonomySection(heading: string): string[] {
  const headingMarker = `### ${heading}`
  const headingStart = taxonomy.indexOf(headingMarker)
  if (headingStart < 0) {
    throw new Error(`Missing taxonomy section: ${heading}`)
  }

  const sectionStart = headingStart + headingMarker.length
  const remaining = taxonomy.slice(sectionStart)
  const nextHeadingOffset = remaining.search(/^### /m)
  const section = nextHeadingOffset < 0 ? remaining : remaining.slice(0, nextHeadingOffset)

  return [...section.matchAll(/^- `(j_[^`]+)`/gm)].map((match) => match[1]!)
}

describe('classification review registry', () => {
  it('matches the durable taxonomy lists exactly', () => {
    const representativeIds = idsInTaxonomySection('代表牌')
    const historicalIds = idsInTaxonomySection('历史调整牌')

    expect(representativeIds).toHaveLength(34)
    expect(historicalIds).toHaveLength(61)
    expect(CLASSIFICATION_REVIEW_CASE_IDS_BY_KIND.representative).toEqual(representativeIds)
    expect(CLASSIFICATION_REVIEW_CASE_IDS_BY_KIND.historical_adjustment).toEqual(historicalIds)
    expect(CLASSIFICATION_REVIEW_CASE_IDS).toEqual(historicalIds)
  })

  it('keeps all groups complete and every ID unique', () => {
    expect(CLASSIFICATION_REVIEW_CASES).toHaveLength(61)
    expect(new Set(CLASSIFICATION_REVIEW_CASE_IDS).size).toBe(61)
    expect(CLASSIFICATION_REVIEW_CASE_IDS_BY_KIND.user_reported).toHaveLength(15)
    expect(CLASSIFICATION_REVIEW_CASE_IDS_BY_KIND.representative).toHaveLength(34)
    expect(CLASSIFICATION_REVIEW_CASE_IDS_BY_KIND.historical_adjustment).toHaveLength(61)

    for (const reviewCase of CLASSIFICATION_REVIEW_CASES) {
      expect(reviewCase.reasonZh.trim()).not.toBe('')
      expect(new Set(reviewCase.kinds).size).toBe(reviewCase.kinds.length)
      expect(reviewCase.kinds).toContain('historical_adjustment')
    }
  })

  it('preserves known player reports and overlapping identities', () => {
    expect(CLASSIFICATION_REVIEW_CASE_IDS_BY_KIND.user_reported).toEqual(
      expect.arrayContaining([
        'j_hologram',
        'j_trousers',
        'j_castle',
        'j_certificate',
        'j_lucky_cat',
        'j_ring_master',
      ]),
    )

    const hologram = CLASSIFICATION_REVIEW_CASES.find(({ id }) => id === 'j_hologram')
    expect(hologram?.kinds).toEqual(['user_reported', 'representative', 'historical_adjustment'])

    const rideTheBus = CLASSIFICATION_REVIEW_CASES.find(({ id }) => id === 'j_ride_the_bus')
    expect(rideTheBus?.kinds).toEqual(['historical_adjustment'])
  })
})

import { jokers } from '../data'
import { JOKER_CLASSIFICATION_VERSION, JOKER_DATA_GAME_VERSION, type Joker } from '../data/types'
import { describe, expect, it } from 'vitest'
import { compareJokers } from './compare'
import {
  DAILY_EPOCH,
  createDailyOrder,
  createSeededRandom,
  getBeijingDateKey,
  getDailyAnswer,
  getPracticeAnswer,
} from './daily'

function makeJoker(number: number): Joker {
  const id = `j_${String(number).padStart(3, '0')}`
  return {
    id,
    number,
    name: { en: `Joker ${number}`, zhCN: `小丑 ${number}` },
    imagePath: `/jokers/${id}.png`,
    official: {
      gameVersion: JOKER_DATA_GAME_VERSION,
      rarity: 'common',
      cost: 5,
      shopPurchasable: true,
    },
    source: {
      wikiPageUrl: `https://example.com/${id}`,
      effectTextEn: 'Fixture effect',
      unlockRequirementEn: 'Available from start.',
      wikiType: 'effect',
      wikiActivation: 'passive',
      imageUrl: `https://example.com/${id}.png`,
      imageSha1: id,
      localImageSha1: id,
      imageWidth: 71,
      imageHeight: 95,
    },
    classification: {
      version: JOKER_CLASSIFICATION_VERSION,
      acquisition: { kind: 'shop', unlockState: 'starting' },
      effects: ['mechanism'],
      timings: ['passive'],
      dependencies: [{ family: 'none' }],
    },
  }
}

const dailyPool = Array.from({ length: 150 }, (_, index) => makeJoker(index + 1))

describe('Beijing date keys', () => {
  it('changes at midnight in Beijing', () => {
    expect(getBeijingDateKey('2026-07-17T15:59:59.999Z')).toBe('2026-07-17')
    expect(getBeijingDateKey('2026-07-17T16:00:00.000Z')).toBe('2026-07-18')
  })

  it('rejects invalid dates', () => {
    expect(() => getBeijingDateKey('not-a-date')).toThrow('Date must be valid')
  })
})

describe('daily rotation', () => {
  it('creates a stable shuffle independent of input order', () => {
    const first = createDailyOrder(dailyPool).map((joker) => joker.id)
    const second = createDailyOrder([...dailyPool].reverse()).map((joker) => joker.id)

    expect(second).toEqual(first)
    expect(new Set(first).size).toBe(150)
    expect(first).not.toEqual(dailyPool.map((joker) => joker.id))
  })

  it('returns a stable answer throughout one Beijing day', () => {
    const morning = getDailyAnswer(dailyPool, '2026-07-18T00:00:00+08:00')
    const evening = getDailyAnswer(dailyPool, '2026-07-18T23:59:59+08:00')

    expect(evening.id).toBe(morning.id)
  })

  it('uses every Joker once before the 150-day rotation repeats', () => {
    const answers = Array.from({ length: 150 }, (_, offset) => {
      const date = new Date(Date.UTC(2026, 6, 18 + offset, 12))
      return getDailyAnswer(dailyPool, date).id
    })
    const nextRotation = getDailyAnswer(dailyPool, new Date(Date.UTC(2026, 6, 18 + 150, 12))).id

    expect(new Set(answers).size).toBe(150)
    expect(nextRotation).toBe(answers[0])
  })

  it('anchors the first rotation day to the declared epoch', () => {
    const epochAnswer = getDailyAnswer(dailyPool, `${DAILY_EPOCH}T00:00:00+08:00`)
    expect(epochAnswer.id).toBe(createDailyOrder(dailyPool)[0]?.id)
  })

  it('requires a complete 150-Joker daily pool', () => {
    expect(() => createDailyOrder(dailyPool.slice(0, 149))).toThrow(
      'Daily mode requires exactly 150 Jokers',
    )
  })

  it('runs the production catalog through one complete rotation and every comparison', () => {
    const order = createDailyOrder(jokers)
    const answer = getDailyAnswer(jokers, `${DAILY_EPOCH}T00:00:00+08:00`)
    const comparisons = jokers.map((guess) => compareJokers(guess, answer))

    expect(order).toHaveLength(150)
    expect(new Set(order.map((joker) => joker.id)).size).toBe(150)
    expect(comparisons).toHaveLength(150)
    expect(comparisons.filter((comparison) => comparison.correct)).toHaveLength(1)
  })
})

describe('random sources', () => {
  it('produces the same deterministic sequence for the same seed', () => {
    const first = createSeededRandom('stable-seed')
    const second = createSeededRandom('stable-seed')

    expect(Array.from({ length: 8 }, first)).toEqual(Array.from({ length: 8 }, second))
  })

  it('lets practice mode inject its random source', () => {
    const pool = [makeJoker(3), makeJoker(1), makeJoker(2)]

    expect(getPracticeAnswer(pool, () => 0).number).toBe(1)
    expect(getPracticeAnswer(pool, () => 0.999_999).number).toBe(3)
  })

  it('rejects random values outside the half-open unit interval', () => {
    expect(() => getPracticeAnswer(dailyPool, () => 1)).toThrow(
      'Random source must return a value in [0, 1)',
    )
  })
})

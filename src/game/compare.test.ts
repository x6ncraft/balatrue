import {
  JOKER_CLASSIFICATION_VERSION,
  JOKER_DATA_GAME_VERSION,
  type Joker,
  type JokerDependency,
  type JokerEffect,
  type JokerRarity,
  type JokerTiming,
} from '../data/types'
import { describe, expect, it } from 'vitest'
import { compareJokers } from './compare'

interface FixtureOptions {
  id?: string
  number?: number
  rarity?: JokerRarity
  cost?: number | null
  acquisition?: 'shop' | 'soul'
  effects?: JokerEffect[]
  timings?: JokerTiming[]
  dependencies?: JokerDependency[]
}

function makeJoker(options: FixtureOptions = {}): Joker {
  const id = options.id ?? 'j_fixture'
  const acquisition = options.acquisition ?? 'shop'
  const rarity = options.rarity ?? 'common'
  const cost = options.cost === undefined ? (acquisition === 'soul' ? null : 5) : options.cost

  return {
    id,
    number: options.number ?? 1,
    name: { en: id, zhCN: id },
    imagePath: `/jokers/${id}.png`,
    official: {
      gameVersion: JOKER_DATA_GAME_VERSION,
      rarity,
      cost,
      shopPurchasable: acquisition === 'shop',
    },
    source: {
      effectTextSha256: '0'.repeat(64),
      unlockRequirementSha256: '0'.repeat(64),
      wikiType: 'effect',
      wikiActivation: 'passive',
      imageSha1: id,
      localImageSha1: id,
      imageWidth: 71,
      imageHeight: 95,
    },
    classification: {
      version: JOKER_CLASSIFICATION_VERSION,
      acquisition: {
        kind: acquisition,
        unlockState: acquisition === 'soul' ? 'legendary' : 'starting',
      },
      effects: options.effects ?? ['rules:probability'],
      timings: options.timings ?? ['passive'],
      dependencies: options.dependencies ?? [{ family: 'none' }],
    },
  }
}

describe('compareJokers', () => {
  it('marks every field exact for the same Joker', () => {
    const joker = makeJoker()
    const result = compareJokers(joker, joker)

    expect(result.correct).toBe(true)
    expect(result.rarity).toMatchObject({ result: 'exact', direction: null })
    expect(result.acquisition).toMatchObject({ result: 'exact', direction: null })
    expect(result.effects.result).toBe('exact')
    expect(result.timings.result).toBe('exact')
    expect(result.dependencies.result).toBe('exact')
  })

  it('points rarity arrows from the guess toward the answer', () => {
    const common = makeJoker({ id: 'j_common', rarity: 'common' })
    const rare = makeJoker({ id: 'j_rare', rarity: 'rare' })

    expect(compareJokers(common, rare).rarity).toMatchObject({
      result: 'miss',
      direction: 'up',
    })
    expect(compareJokers(rare, common).rarity).toMatchObject({
      result: 'miss',
      direction: 'down',
    })
  })

  it('compares shop prices exactly and points toward the answer price', () => {
    const cheap = makeJoker({ id: 'j_cheap', cost: 4 })
    const expensive = makeJoker({ id: 'j_expensive', cost: 8 })

    expect(compareJokers(cheap, expensive).acquisition).toEqual({
      kind: 'shop',
      shopPrice: 4,
      result: 'miss',
      direction: 'up',
    })
    expect(compareJokers(expensive, cheap).acquisition.direction).toBe('down')
  })

  it('orders Soul above shop prices without inventing a numeric price', () => {
    const soul = makeJoker({
      id: 'j_soul',
      rarity: 'legendary',
      acquisition: 'soul',
    })
    const otherSoul = makeJoker({
      id: 'j_other_soul',
      rarity: 'legendary',
      acquisition: 'soul',
    })
    const shop = makeJoker({ id: 'j_shop', cost: 9 })

    expect(compareJokers(soul, otherSoul).acquisition).toEqual({
      kind: 'soul',
      shopPrice: null,
      result: 'exact',
      direction: null,
    })
    expect(compareJokers(shop, soul).acquisition).toEqual({
      kind: 'shop',
      shopPrice: 9,
      result: 'miss',
      direction: 'up',
    })
    expect(compareJokers(soul, shop).acquisition).toEqual({
      kind: 'soul',
      shopPrice: null,
      result: 'miss',
      direction: 'down',
    })
  })

  it('uses set equality, overlap, and disjointness for effect tags', () => {
    const answer = makeJoker({ effects: ['chips', 'mult'] })
    const exact = makeJoker({ id: 'j_exact', effects: ['mult', 'chips'] })
    const partial = makeJoker({ id: 'j_partial', effects: ['chips', 'economy'] })
    const miss = makeJoker({ id: 'j_miss', effects: ['x_mult'] })

    expect(compareJokers(exact, answer).effects.result).toBe('exact')
    expect(compareJokers(partial, answer).effects).toEqual({
      values: ['chips', 'economy'],
      matches: ['chips'],
      exactMechanismMatches: ['chips'],
      categoryOnlyMatches: [],
      result: 'partial',
    })
    expect(compareJokers(miss, answer).effects.result).toBe('miss')
  })

  it('compares the playable timing-family sets instead of singleton events', () => {
    const answer = makeJoker({ timings: ['card_scored', 'round_end'] })
    const partial = makeJoker({ id: 'j_partial', timings: ['card_played', 'round_start'] })
    const empty = makeJoker({ id: 'j_empty', timings: [] })

    expect(compareJokers(partial, answer).timings).toEqual({
      values: ['hand_action', 'round_boundary'],
      matches: ['round_boundary'],
      result: 'partial',
    })
    expect(compareJokers(empty, makeJoker({ timings: [] })).timings.result).toBe('exact')
  })

  it('does not mark different play events as an exact timing match', () => {
    const answer = makeJoker({ timings: ['card_scored', 'joker_triggered'] })
    const guess = makeJoker({ id: 'j_guess', timings: ['card_played'] })

    expect(compareJokers(guess, answer).timings).toEqual({
      values: ['hand_action'],
      matches: [],
      result: 'miss',
    })
  })

  it('marks different mechanisms in the same broad effect category as partial', () => {
    const answer = makeJoker({ effects: ['generate:tarot'] })
    const guess = makeJoker({ id: 'j_guess', effects: ['generate:spectral'] })

    expect(compareJokers(guess, answer).effects).toEqual({
      values: ['generate'],
      matches: ['generate'],
      exactMechanismMatches: [],
      categoryOnlyMatches: ['generate:spectral'],
      result: 'partial',
    })
  })

  it('marks different broad effect categories as a miss', () => {
    const answer = makeJoker({ effects: ['generate:tarot'] })
    const guess = makeJoker({ id: 'j_guess', effects: ['modify:gold_card'] })

    expect(compareJokers(guess, answer).effects).toEqual({
      values: ['adjust'],
      matches: [],
      exactMechanismMatches: [],
      categoryOnlyMatches: [],
      result: 'miss',
    })
  })

  it('keeps comparable scopes for the otherwise identical hand-rule Jokers', () => {
    const fourFingers = makeJoker({ effects: ['rules:poker_hand_size'] })
    const shortcut = makeJoker({ id: 'j_shortcut', effects: ['rules:straight_gap'] })

    expect(compareJokers(fourFingers, shortcut).effects).toEqual({
      values: ['mechanic'],
      matches: ['mechanic'],
      exactMechanismMatches: [],
      categoryOnlyMatches: ['rules:poker_hand_size'],
      result: 'partial',
    })
  })

  it('marks same dependency family with a different value as partial', () => {
    const answer = makeJoker({ dependencies: [{ family: 'suit', value: 'hearts' }] })
    const guess = makeJoker({
      id: 'j_guess',
      dependencies: [{ family: 'suit', value: 'spades' }],
    })
    const result = compareJokers(guess, answer).dependencies

    expect(result.result).toBe('partial')
    expect(result.exactMatches).toEqual([])
    expect(result.familyMatches).toEqual([{ family: 'cards', value: 'suit:spades' }])
  })

  it('distinguishes exact dependency overlap from complete set equality', () => {
    const answer = makeJoker({
      dependencies: [
        { family: 'rank', value: 'ace' },
        { family: 'suit', value: 'hearts' },
      ],
    })
    const guess = makeJoker({
      id: 'j_guess',
      dependencies: [{ family: 'rank', value: 'ace' }],
    })

    expect(compareJokers(guess, answer).dependencies).toMatchObject({
      result: 'partial',
      exactMatches: [{ family: 'cards', value: 'rank:ace' }],
      familyMatches: [],
    })
  })

  it('merges related source conditions while separating different player directions', () => {
    const moneyAnswer = makeJoker({ dependencies: [{ family: 'money' }] })
    const shopGuess = makeJoker({ id: 'j_shop', dependencies: [{ family: 'shop' }] })
    const handAnswer = makeJoker({ dependencies: [{ family: 'poker_hand', value: 'straight' }] })
    const rankGuess = makeJoker({ id: 'j_rank', dependencies: [{ family: 'rank', value: 'ace' }] })

    expect(compareJokers(shopGuess, moneyAnswer).dependencies).toEqual({
      values: [{ family: 'economy', value: 'shop' }],
      exactMatches: [],
      familyMatches: [{ family: 'economy', value: 'shop' }],
      result: 'partial',
    })
    expect(compareJokers(rankGuess, handAnswer).dependencies).toMatchObject({
      familyMatches: [],
      result: 'miss',
    })
  })

  it('preserves an independent playing-card condition beside a rank condition', () => {
    const answer = makeJoker({
      dependencies: [
        { family: 'rank', value: 'face' },
        { family: 'playing_card', value: 'first_scoring' },
      ],
    })
    const guess = makeJoker({
      id: 'j_guess',
      dependencies: [{ family: 'rank', value: 'face' }],
    })

    expect(compareJokers(guess, answer).dependencies).toEqual({
      values: [{ family: 'cards', value: 'rank:face' }],
      exactMatches: [{ family: 'cards', value: 'rank:face' }],
      familyMatches: [],
      result: 'partial',
    })
  })

  it('marks disjoint dependency families as a miss', () => {
    const answer = makeJoker({ dependencies: [{ family: 'money' }] })
    const guess = makeJoker({ id: 'j_guess', dependencies: [{ family: 'blind' }] })

    expect(compareJokers(guess, answer).dependencies.result).toBe('miss')
  })
})

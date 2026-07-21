import { jokers } from '../data'
import type { Joker } from '../data/types'
import { describe, expect, it } from 'vitest'
import { compareJokers } from './compare'
import { gameplayClueSignature } from './clue-model'

function joker(id: string): Joker {
  const match = jokers.find((candidate) => candidate.id === id)
  if (!match) throw new Error(`Missing audited Joker ${id}`)
  return match
}

describe('audited c11 clue semantics', () => {
  it.each([
    ['j_certificate', ['generate:sealed_card'], ['round_start'], [{ family: 'none' }]],
    ['j_marble', ['generate:stone_card'], ['blind_selected'], [{ family: 'none' }]],
    [
      'j_stone',
      ['chips'],
      ['hand_scored'],
      [
        { family: 'card_modifier', value: 'stone' },
        { family: 'deck', value: 'full_count' },
      ],
    ],
    [
      'j_cartomancer',
      ['generate:tarot'],
      ['blind_selected'],
      [{ family: 'consumable', value: 'available_slot' }],
    ],
    ['j_midas_mask', ['modify:gold_card'], ['card_scored'], [{ family: 'rank', value: 'face' }]],
    [
      'j_faceless',
      ['economy'],
      ['card_discarded'],
      [
        { family: 'rank', value: 'face' },
        { family: 'discard', value: 'card_count_gte_3' },
      ],
    ],
    [
      'j_burnt',
      ['modify:poker_hand_level'],
      ['card_discarded'],
      [{ family: 'discard', value: 'first' }],
    ],
    ['j_supernova', ['mult'], ['hand_scored'], [{ family: 'hand', value: 'played_hand_count' }]],
    [
      'j_madness',
      ['x_mult'],
      ['hand_scored', 'blind_selected'],
      [{ family: 'blind', value: 'small_or_big' }],
    ],
    ['j_chaos', ['resource:reroll'], ['shop'], [{ family: 'none' }]],
    [
      'j_stuntman',
      ['chips', 'resource:hand_size'],
      ['passive', 'hand_scored'],
      [{ family: 'none' }],
    ],
    [
      'j_trading',
      ['economy', 'modify:destroy_playing_card'],
      ['card_discarded'],
      [
        { family: 'discard', value: 'card_count_1' },
        { family: 'discard', value: 'first' },
      ],
    ],
    ['j_chicot', ['rules:boss_blind'], ['blind_selected'], [{ family: 'none' }]],
    ['j_luchador', ['rules:boss_blind'], ['sold'], [{ family: 'blind', value: 'current_boss' }]],
    [
      'j_campfire',
      ['x_mult'],
      ['hand_scored', 'blind_defeated', 'sold'],
      [
        { family: 'blind', value: 'boss' },
        { family: 'shop', value: 'sold_card_count' },
      ],
    ],
    ['j_ring_master', ['rules:duplicates'], ['passive'], [{ family: 'none' }]],
  ] as const)(
    'keeps effects, timing, and pre-existing conditions separate for %s',
    (id, effects, timings, dependencies) => {
      expect(joker(id).classification).toMatchObject({ effects, timings, dependencies })
    },
  )

  it.each([
    ['j_8_ball', 'generate:tarot'],
    ['j_sixth_sense', 'generate:spectral'],
    ['j_superposition', 'generate:tarot'],
    ['j_seance', 'generate:spectral'],
    ['j_vagabond', 'generate:tarot'],
    ['j_hallucination', 'generate:tarot'],
    ['j_cartomancer', 'generate:tarot'],
  ] as const)(
    'uses an open consumable slot instead of the generated result for %s',
    (id, effect) => {
      const classification = joker(id).classification
      expect(classification.effects).toContain(effect)
      expect(classification.dependencies).toContainEqual({
        family: 'consumable',
        value: 'available_slot',
      })
      expect(classification.dependencies).not.toContainEqual({
        family: 'consumable',
        value: 'tarot',
      })
      expect(classification.dependencies).not.toContainEqual({
        family: 'consumable',
        value: 'spectral',
      })
    },
  )

  it.each([
    'j_certificate',
    'j_marble',
    'j_burglar',
    'j_four_fingers',
    'j_pareidolia',
    'j_space',
    'j_splash',
    'j_shortcut',
    'j_smeared',
    'j_gift',
    'j_astronomer',
    'j_chicot',
    'j_juggler',
    'j_drunkard',
    'j_troubadour',
    'j_ring_master',
    'j_merry_andy',
    'j_stuntman',
  ])('does not leak an unconditional output into dependencies for %s', (id) => {
    expect(joker(id).classification.dependencies).toEqual([{ family: 'none' }])
  })

  it('keeps every non-empty dependency as a concrete narrowing condition', () => {
    for (const candidate of jokers) {
      for (const dependency of candidate.classification.dependencies) {
        expect(
          dependency.family === 'none' || dependency.value !== undefined,
          `${candidate.id} contains a scope-only dependency '${dependency.family}'`,
        ).toBe(true)
      }
    }
  })

  it('keeps all 150 public clue signatures unique after the semantic cleanup', () => {
    expect(new Set(jokers.map(gameplayClueSignature)).size).toBe(jokers.length)
  })

  it('gives every answer exact public feedback when guessed directly', () => {
    for (const answer of jokers) {
      const result = compareJokers(answer, answer)
      expect(result).toMatchObject({
        correct: true,
        rarity: { result: 'exact' },
        acquisition: { result: 'exact' },
        effects: { result: 'exact' },
        timings: { result: 'exact' },
        dependencies: { result: 'exact' },
      })
    }
  })
})

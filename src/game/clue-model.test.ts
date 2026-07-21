import { jokers } from '../data'
import {
  JOKER_CLASSIFICATION_VERSION,
  JOKER_DATA_GAME_VERSION,
  JOKER_EFFECTS,
  JOKER_TIMINGS,
  type Joker,
  type JokerDependency,
  type JokerTiming,
} from '../data/types'
import { describe, expect, it } from 'vitest'
import {
  GAME_DEPENDENCY_FAMILIES,
  GAME_EFFECT_CATEGORIES,
  gameEffectCategory,
  gameTimingFamily,
  projectJokerDependencies,
  projectJokerEffectCategories,
  projectJokerEffectValues,
  projectJokerTimingFamilies,
  projectJokerTimings,
  type GameDependencyFamily,
  type GameTimingFamily,
} from './clue-model'

function makeJoker(options: { timings?: JokerTiming[]; dependencies?: JokerDependency[] }): Joker {
  return {
    id: 'j_fixture',
    number: 1,
    name: { en: 'Fixture', zhCN: '测试小丑' },
    imagePath: '/jokers/j_fixture.png',
    official: {
      gameVersion: JOKER_DATA_GAME_VERSION,
      rarity: 'common',
      cost: 5,
      shopPurchasable: true,
    },
    source: {
      effectTextSha256: '0'.repeat(64),
      unlockRequirementSha256: '0'.repeat(64),
      wikiType: 'effect',
      wikiActivation: 'passive',
      imageSha1: 'fixture',
      localImageSha1: 'fixture',
      imageWidth: 71,
      imageHeight: 95,
    },
    classification: {
      version: JOKER_CLASSIFICATION_VERSION,
      acquisition: { kind: 'shop', unlockState: 'starting' },
      effects: ['rules:probability'],
      timings: options.timings ?? ['passive'],
      dependencies: options.dependencies ?? [{ family: 'none' }],
    },
  }
}

describe('player-facing clue projection', () => {
  it('keeps the board taxonomy to seven effect and seven dependency directions', () => {
    expect(GAME_EFFECT_CATEGORIES).toEqual([
      'chips',
      'mult',
      'x_mult',
      'economy',
      'generate',
      'adjust',
      'mechanic',
    ])
    expect(GAME_DEPENDENCY_FAMILIES).toEqual([
      'cards',
      'hand',
      'discard',
      'economy',
      'other_cards',
      'progress',
      'none',
    ])
  })

  it('projects every exact effect into a playable category', () => {
    expect(new Set(JOKER_EFFECTS.map(gameEffectCategory))).toEqual(new Set(GAME_EFFECT_CATEGORIES))
  })

  it.each([
    ['j_certificate', ['generate']],
    ['j_marble', ['generate']],
    ['j_cartomancer', ['generate']],
    ['j_sixth_sense', ['generate', 'adjust']],
    ['j_four_fingers', ['mechanic']],
    ['j_shortcut', ['mechanic']],
  ] as const)('projects playable effects for %s', (id, expected) => {
    const joker = jokers.find((candidate) => candidate.id === id)
    if (!joker) throw new Error(`Missing Joker fixture ${id}`)
    expect(projectJokerEffectValues(joker)).toEqual(expected)
  })

  it('keeps every effect category shared by at least ten Jokers', () => {
    for (const category of GAME_EFFECT_CATEGORIES) {
      expect(
        jokers.filter((joker) => projectJokerEffectCategories(joker).includes(category)).length,
      ).toBeGreaterThanOrEqual(10)
    }
  })

  it('keeps every dependency category shared by at least eight Jokers', () => {
    for (const family of GAME_DEPENDENCY_FAMILIES) {
      expect(
        jokers.filter((joker) =>
          projectJokerDependencies(joker).some((dependency) => dependency.family === family),
        ).length,
      ).toBeGreaterThanOrEqual(8)
    }
  })

  const timingCases: ReadonlyArray<[JokerTiming, GameTimingFamily]> = [
    ['passive', 'always'],
    ['hand_scored', 'hand_scored'],
    ['card_scored', 'card_scored'],
    ['card_played', 'hand_action'],
    ['card_held', 'hand_action'],
    ['card_discarded', 'hand_action'],
    ['consumable_used', 'card_management'],
    ['card_added', 'card_management'],
    ['card_destroyed', 'card_management'],
    ['blind_selected', 'blind'],
    ['blind_skipped', 'blind'],
    ['blind_defeated', 'blind'],
    ['blind_failed', 'blind'],
    ['shop', 'shop'],
    ['booster_opened', 'shop'],
    ['booster_skipped', 'shop'],
    ['shop_rerolled', 'shop'],
    ['shop_ended', 'shop'],
    ['round_start', 'round_boundary'],
    ['round_end', 'round_boundary'],
    ['sold', 'shop'],
    ['joker_triggered', 'hand_scored'],
  ]

  it.each(timingCases)('groups exact timing %s under %s', (raw, expected) => {
    expect(gameTimingFamily(raw)).toBe(expected)
  })

  it('keeps exact timing events in their audited order', () => {
    expect(
      projectJokerTimings(
        makeJoker({ timings: ['round_end', 'card_played', 'hand_scored', 'passive'] }),
      ),
    ).toEqual(['passive', 'hand_scored', 'card_played', 'round_end'])
  })

  it('covers every registered timing in the family projection', () => {
    expect(timingCases.map(([timing]) => timing)).toEqual([...JOKER_TIMINGS])
  })

  it.each([
    ['j_constellation', ['hand_scored', 'consumable_used']],
    ['j_castle', ['hand_scored', 'card_discarded', 'round_end']],
    ['j_certificate', ['round_start']],
    ['j_throwback', ['hand_scored', 'blind_skipped']],
    ['j_mr_bones', ['blind_failed']],
    ['j_campfire', ['hand_scored', 'blind_defeated', 'sold']],
    ['j_hallucination', ['booster_opened']],
    ['j_perkeo', ['shop_ended']],
  ] as const)('keeps exact timing evidence for %s', (id, expected) => {
    const joker = jokers.find((candidate) => candidate.id === id)
    if (!joker) throw new Error(`Missing Joker fixture ${id}`)
    expect(projectJokerTimings(joker)).toEqual(expected)
  })

  it.each([
    ['j_certificate', ['round_boundary']],
    ['j_throwback', ['hand_scored', 'blind']],
    ['j_castle', ['hand_scored', 'hand_action', 'round_boundary']],
    ['j_hallucination', ['shop']],
  ] as const)('projects playable timing families for %s', (id, expected) => {
    const joker = jokers.find((candidate) => candidate.id === id)
    if (!joker) throw new Error(`Missing Joker fixture ${id}`)
    expect(projectJokerTimingFamilies(joker)).toEqual(expected)
  })

  it('gives every Joker at least one playable timing family', () => {
    expect(jokers.filter((joker) => projectJokerTimingFamilies(joker).length === 0)).toEqual([])
  })

  const dependencyCases: ReadonlyArray<[JokerDependency['family'], GameDependencyFamily]> = [
    ['suit', 'cards'],
    ['rank', 'cards'],
    ['playing_card', 'cards'],
    ['card_modifier', 'cards'],
    ['deck', 'cards'],
    ['poker_hand', 'hand'],
    ['discard', 'discard'],
    ['hand', 'hand'],
    ['money', 'economy'],
    ['shop', 'economy'],
    ['joker', 'other_cards'],
    ['joker_slot', 'other_cards'],
    ['consumable', 'other_cards'],
    ['round', 'progress'],
    ['blind', 'progress'],
    ['none', 'none'],
  ]

  it.each(dependencyCases)('maps raw dependency %s to %s', (raw, expected) => {
    const dependencies = projectJokerDependencies(makeJoker({ dependencies: [{ family: raw }] }))
    expect(dependencies).toEqual([
      expected === 'none' ? { family: 'none' } : { family: expected, value: raw },
    ])
  })

  it('keeps independently meaningful playing-card details beside rank conditions', () => {
    expect(
      projectJokerDependencies(
        makeJoker({
          dependencies: [
            { family: 'rank', value: 'face' },
            { family: 'playing_card', value: 'first_scoring' },
          ],
        }),
      ),
    ).toEqual([
      { family: 'cards', value: 'rank:face' },
      { family: 'hand', value: 'playing_card:first_scoring' },
    ])
  })
})

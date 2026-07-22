import { jokers } from '../data'
import {
  JOKER_CLASSIFICATION_VERSION,
  JOKER_DATA_GAME_VERSION,
  JOKER_EFFECTS,
  JOKER_TIMINGS,
  type Joker,
  type JokerAbilityRole,
  type JokerDependency,
  type JokerSelfGate,
  type JokerTiming,
} from '../data/types'
import { describe, expect, it } from 'vitest'
import {
  GAME_DEPENDENCY_FAMILIES,
  GAME_EFFECT_CATEGORIES,
  GAME_TIMING_FAMILIES,
  gameEffectCategory,
  gameTimingFamily,
  projectJokerDependencies,
  projectJokerEffectCategories,
  projectJokerEffectBehaviors,
  projectJokerEffectDetails,
  projectJokerEffectValues,
  projectJokerTimingFamilies,
  projectJokerTimings,
  type GameDependencyFamily,
  type GameTimingFamily,
} from './clue-model'

function makeJoker(options: {
  timings?: JokerTiming[]
  dependencies?: JokerDependency[]
  role?: JokerAbilityRole
  selfGates?: JokerSelfGate[]
}): Joker {
  const dependencies = (options.dependencies ?? []).filter(
    (dependency) => dependency.family !== 'none',
  )
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
      abilities: (options.timings ?? ['passive']).map((event) => ({
        event,
        role: options.role ?? 'apply',
        effects: ['rules:probability'],
        eventFilters: [],
        externalReads: dependencies,
        selfGates: options.selfGates ?? [],
      })),
    },
  }
}

describe('player-facing clue projection', () => {
  it('keeps the board taxonomy to seven directions per category clue', () => {
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
    expect(GAME_TIMING_FAMILIES).toEqual([
      'always',
      'hand_scored',
      'card_scored',
      'card_action',
      'blind',
      'shop',
      'round_boundary',
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

  it('derives behavior details from ability clauses without inventing a second data source', () => {
    const growing = makeJoker({ role: 'grow' })
    expect(projectJokerEffectBehaviors(growing)).toEqual(['growth'])
    expect(projectJokerEffectDetails(growing)).toEqual(['rules:probability', 'behavior:growth'])
  })

  it('keeps every effect category shared by at least ten Jokers', () => {
    for (const category of GAME_EFFECT_CATEGORIES) {
      expect(
        jokers.filter((joker) => projectJokerEffectCategories(joker).includes(category)).length,
      ).toBeGreaterThanOrEqual(10)
    }
  })

  it('keeps every dependency category shared by multiple useful comparison cases', () => {
    for (const family of GAME_DEPENDENCY_FAMILIES) {
      expect(
        jokers.filter((joker) =>
          projectJokerDependencies(joker).some((dependency) => dependency.family === family),
        ).length,
      ).toBeGreaterThanOrEqual(6)
    }
  })

  const timingCases: ReadonlyArray<[JokerTiming, GameTimingFamily]> = [
    ['passive', 'always'],
    ['hand_scored', 'hand_scored'],
    ['card_scored', 'card_scored'],
    ['card_played', 'card_action'],
    ['card_held', 'card_action'],
    ['card_discarded', 'card_action'],
    ['consumable_used', 'card_action'],
    ['card_added', 'card_action'],
    ['card_destroyed', 'card_action'],
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
    ['j_throwback', ['hand_scored']],
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
    ['j_throwback', ['hand_scored']],
    ['j_castle', ['hand_scored', 'card_action', 'round_boundary']],
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

  it('uses concrete checks first and derives actions only when a phase needs them', () => {
    expect(
      projectJokerDependencies(
        makeJoker({
          timings: ['card_added', 'card_played', 'consumable_used', 'round_end'],
        }),
      ),
    ).toEqual([
      { family: 'cards', value: 'event:card_added' },
      { family: 'hand', value: 'event:card_played' },
      { family: 'other_cards', value: 'event:consumable_used' },
      { family: 'progress', value: 'event:round_end' },
    ])
    expect(projectJokerDependencies(makeJoker({ timings: ['passive'] }))).toEqual([
      { family: 'none' },
    ])
  })

  it('keeps generic open-slot constraints out of player checks', () => {
    expect(
      projectJokerDependencies(
        makeJoker({
          timings: ['blind_selected'],
          dependencies: [{ family: 'consumable', value: 'available_slot' }],
        }),
      ),
    ).toEqual([{ family: 'progress', value: 'event:blind_selected' }])

    const allValues = jokers.flatMap((joker) =>
      projectJokerDependencies(joker).flatMap((dependency) =>
        dependency.value ? [dependency.value] : [],
      ),
    )
    expect(allValues).not.toContain('consumable:available_slot')
    expect(allValues).not.toContain('joker_slot:available')
  })

  it('aligns growth cards through their real player checks', () => {
    const checks = (id: string) => {
      const joker = jokers.find((candidate) => candidate.id === id)
      if (!joker) throw new Error(`Missing Joker fixture ${id}`)
      return projectJokerDependencies(joker)
    }

    expect(checks('j_hologram')).toEqual([{ family: 'cards', value: 'event:card_added' }])
    expect(checks('j_trousers')).toEqual([{ family: 'hand', value: 'poker_hand:two_pair' }])
    expect(checks('j_cartomancer')).toEqual([{ family: 'progress', value: 'event:blind_selected' }])
  })

  it('projects only explicitly player-facing self gates into Checks', () => {
    expect(
      projectJokerDependencies(
        makeJoker({
          selfGates: [
            {
              kind: 'counter',
              value: 'after_2_rounds',
              dependency: { family: 'round', value: 'elapsed_2' },
            },
          ],
        }),
      ),
    ).toEqual([{ family: 'progress', value: 'round:elapsed_2' }])

    expect(
      projectJokerDependencies(makeJoker({ selfGates: [{ kind: 'chance', value: '1_in_4' }] })),
    ).toEqual([{ family: 'none' }])
  })
})

import { jokers } from '../data'
import type { Joker, JokerAbilityClause, JokerEffect, JokerTiming } from '../data/types'
import { describe, expect, it } from 'vitest'
import {
  gameplayClueSignature,
  projectJokerDependencies,
  projectJokerEffectBehaviors,
  projectJokerEffects,
  projectJokerTimings,
  type GameDependency,
  type GameEffectBehavior,
} from './clue-model'
import { compareJokers } from './compare'

function joker(id: string): Joker {
  const match = jokers.find((candidate) => candidate.id === id)
  if (!match) throw new Error(`Missing audited Joker ${id}`)
  return match
}

function clauses(id: string): readonly JokerAbilityClause[] {
  return joker(id).classification.abilities
}

interface ExpectedProjection {
  effects: readonly JokerEffect[]
  behaviors: readonly GameEffectBehavior[]
  timings: readonly JokerTiming[]
  dependencies: readonly GameDependency[]
}

describe('audited c12 clue semantics', () => {
  it.each([
    [
      'j_certificate',
      {
        effects: ['generate:sealed_card'],
        behaviors: [],
        timings: ['round_start'],
        dependencies: [{ family: 'progress', value: 'event:round_start' }],
      },
    ],
    [
      'j_marble',
      {
        effects: ['generate:stone_card'],
        behaviors: [],
        timings: ['blind_selected'],
        dependencies: [{ family: 'progress', value: 'event:blind_selected' }],
      },
    ],
    [
      'j_stone',
      {
        effects: ['chips'],
        behaviors: [],
        timings: ['hand_scored'],
        dependencies: [
          { family: 'cards', value: 'card_modifier:stone' },
          { family: 'cards', value: 'deck:full_count' },
        ],
      },
    ],
    [
      'j_midas_mask',
      {
        effects: ['modify:gold_card'],
        behaviors: [],
        timings: ['card_scored'],
        dependencies: [{ family: 'cards', value: 'rank:face' }],
      },
    ],
    [
      'j_madness',
      {
        effects: ['x_mult', 'modify:destroy_joker'],
        behaviors: ['growth'],
        timings: ['hand_scored', 'blind_selected'],
        dependencies: [{ family: 'progress', value: 'blind:small_or_big' }],
      },
    ],
    [
      'j_trading',
      {
        effects: ['economy', 'modify:destroy_playing_card'],
        behaviors: [],
        timings: ['card_discarded'],
        dependencies: [
          { family: 'discard', value: 'discard:card_count_1' },
          { family: 'discard', value: 'discard:first' },
        ],
      },
    ],
    [
      'j_campfire',
      {
        effects: ['x_mult'],
        behaviors: ['growth', 'reset'],
        timings: ['hand_scored', 'blind_defeated', 'sold'],
        dependencies: [
          { family: 'economy', value: 'event:sold' },
          { family: 'progress', value: 'blind:boss' },
        ],
      },
    ],
  ] as const)('projects the complete player-facing clues for %s', (id, expected) => {
    const candidate = joker(id)
    expect({
      effects: projectJokerEffects(candidate),
      behaviors: projectJokerEffectBehaviors(candidate),
      timings: projectJokerTimings(candidate),
      dependencies: projectJokerDependencies(candidate),
    }).toEqual(expected satisfies ExpectedProjection)
  })

  it('binds growth, application, and conditions to the correct Hologram and Trousers clauses', () => {
    expect(clauses('j_hologram')).toEqual([
      expect.objectContaining({
        event: 'hand_scored',
        role: 'apply',
        effects: ['x_mult'],
        eventFilters: [],
      }),
      expect.objectContaining({
        event: 'card_added',
        role: 'grow',
        effects: ['x_mult'],
        eventFilters: [],
      }),
    ])
    expect(clauses('j_trousers')).toEqual([
      expect.objectContaining({ event: 'hand_scored', role: 'apply', eventFilters: [] }),
      expect.objectContaining({
        event: 'card_played',
        role: 'grow',
        eventFilters: [{ family: 'poker_hand', value: 'two_pair' }],
      }),
    ])
  })

  it('separates external history reads from events that merely changed that history', () => {
    expect(clauses('j_fortune_teller')).toEqual([
      expect.objectContaining({
        event: 'hand_scored',
        role: 'apply',
        externalReads: [{ family: 'consumable', value: 'tarot_used_count' }],
      }),
    ])
    expect(clauses('j_throwback')).toEqual([
      expect.objectContaining({
        event: 'hand_scored',
        role: 'apply',
        externalReads: [{ family: 'blind', value: 'skipped_count' }],
      }),
    ])
    expect(clauses('j_satellite')).toEqual([
      expect.objectContaining({
        event: 'round_end',
        role: 'apply',
        externalReads: [{ family: 'consumable', value: 'unique_planets_used' }],
      }),
    ])
  })

  it('distinguishes Blackboard ambient reads from Baron card-held triggers', () => {
    expect(clauses('j_blackboard')).toEqual([
      expect.objectContaining({
        event: 'hand_scored',
        eventFilters: [],
        externalReads: [{ family: 'playing_card', value: 'held_clubs_or_spades' }],
      }),
    ])
    expect(clauses('j_baron')).toEqual([
      expect.objectContaining({
        event: 'card_held',
        eventFilters: [{ family: 'playing_card', value: 'held_king' }],
        externalReads: [],
      }),
    ])
  })

  it('keeps opposite growth and reset conditions on their own clauses', () => {
    expect(clauses('j_ride_the_bus')).toEqual([
      expect.objectContaining({ event: 'hand_scored', role: 'apply' }),
      expect.objectContaining({
        event: 'card_played',
        role: 'grow',
        eventFilters: [{ family: 'playing_card', value: 'no_scoring_face' }],
      }),
      expect.objectContaining({
        event: 'card_played',
        role: 'reset',
        eventFilters: [{ family: 'playing_card', value: 'scoring_face' }],
      }),
    ])
    expect(clauses('j_obelisk')).toEqual([
      expect.objectContaining({ event: 'hand_scored', role: 'apply' }),
      expect.objectContaining({
        event: 'card_played',
        role: 'grow',
        eventFilters: [{ family: 'poker_hand', value: 'not_most_played' }],
      }),
      expect.objectContaining({
        event: 'card_played',
        role: 'reset',
        eventFilters: [{ family: 'poker_hand', value: 'most_played' }],
      }),
    ])
  })

  it('keeps generated or modified results out of Checks', () => {
    expect(projectJokerDependencies(joker('j_certificate'))).toEqual([
      { family: 'progress', value: 'event:round_start' },
    ])
    expect(projectJokerDependencies(joker('j_marble'))).toEqual([
      { family: 'progress', value: 'event:blind_selected' },
    ])
    expect(projectJokerDependencies(joker('j_vampire'))).toEqual([
      { family: 'cards', value: 'card_modifier:enhancement' },
    ])
    expect(projectJokerEffects(joker('j_vampire'))).toEqual(['x_mult', 'modify:remove_enhancement'])
  })

  it('shows meaningful self gates while keeping chance and expiry internal', () => {
    expect(projectJokerDependencies(joker('j_invisible'))).toEqual([
      { family: 'other_cards', value: 'joker:other_random' },
      { family: 'progress', value: 'round:elapsed_2' },
    ])
    expect(projectJokerDependencies(joker('j_yorick'))).toEqual([
      { family: 'discard', value: 'discard:history_count_23' },
    ])
    expect(projectJokerDependencies(joker('j_selzer'))).toEqual([
      { family: 'hand', value: 'event:card_played' },
    ])
    expect(projectJokerEffectBehaviors(joker('j_selzer'))).toEqual(['decay'])
    expect(projectJokerEffectBehaviors(joker('j_gros_michel'))).toEqual(['self_destruct'])
  })

  it('stores no flat clue copy or sentinel dependency in the c12 authority', () => {
    for (const candidate of jokers) {
      expect(candidate.classification).not.toHaveProperty('effects')
      expect(candidate.classification).not.toHaveProperty('timings')
      expect(candidate.classification).not.toHaveProperty('dependencies')
      expect(candidate.classification.abilities.length, candidate.id).toBeGreaterThan(0)

      for (const clause of candidate.classification.abilities) {
        expect(clause.eventFilters, `${candidate.id} has a none event filter`).not.toContainEqual({
          family: 'none',
        })
        expect(clause.externalReads, `${candidate.id} has a none external read`).not.toContainEqual(
          {
            family: 'none',
          },
        )
      }
    }
  })

  it('keeps all 150 public clue signatures unique after the semantic rebuild', () => {
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

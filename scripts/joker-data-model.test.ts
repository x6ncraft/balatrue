// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { jokers } from '../src/data/jokers.generated'
import {
  JOKER_ABILITY_ROLES,
  JOKER_EFFECTS,
  JOKER_REMOVAL_KINDS,
  JOKER_SELF_GATE_KINDS,
  JOKER_TIMINGS,
  deriveJokerAbilityBehaviors,
  type Joker,
  type JokerAbilityClause,
} from '../src/data/types'
import {
  C12_AUDITED_JOKER_IDS,
  C12_CHANGED_FROM_C11_JOKER_IDS,
  C12_EXPLICIT_ABILITY_JOKER_IDS,
  C12_SAFE_INFERENCE_OVERRIDE_JOKER_IDS,
} from './joker-data-model'

function joker(id: string): Joker {
  const match = jokers.find((candidate) => candidate.id === id)
  if (!match) throw new Error(`Missing audited Joker ${id}`)
  return match
}

function abilities(id: string): readonly JokerAbilityClause[] {
  return joker(id).classification.abilities
}

describe('c12 Joker ability model', () => {
  it('keeps all 150 source records inside the explicit audit manifest', () => {
    expect(C12_AUDITED_JOKER_IDS).toHaveLength(150)
    expect(new Set(C12_AUDITED_JOKER_IDS).size).toBe(150)
    expect(new Set(C12_AUDITED_JOKER_IDS)).toEqual(new Set(jokers.map(({ id }) => id)))
  })

  it('exports stable review sets for explicit clauses and c11 changes', () => {
    expect(C12_EXPLICIT_ABILITY_JOKER_IDS.length).toBeGreaterThan(50)
    expect(C12_CHANGED_FROM_C11_JOKER_IDS).toHaveLength(42)
    for (const id of [...C12_EXPLICIT_ABILITY_JOKER_IDS, ...C12_CHANGED_FROM_C11_JOKER_IDS]) {
      expect(C12_AUDITED_JOKER_IDS).toContain(id)
    }
    expect(
      C12_SAFE_INFERENCE_OVERRIDE_JOKER_IDS.filter((id) =>
        C12_EXPLICIT_ABILITY_JOKER_IDS.includes(id),
      ),
    ).toEqual([])
  })

  it('requires explicit clauses for every mixed or multi-clause ability', () => {
    for (const candidate of jokers) {
      if (
        candidate.source.wikiActivation === 'mixed' ||
        candidate.classification.abilities.length > 1
      ) {
        expect(C12_EXPLICIT_ABILITY_JOKER_IDS, candidate.id).toContain(candidate.id)
      }
    }
  })

  it.each([
    'j_8_ball',
    'j_business',
    'j_gros_michel',
    'j_space',
    'j_cavendish',
    'j_reserved_parking',
    'j_hallucination',
    'j_bloodstone',
  ])('records the chance gate for %s', (id) => {
    expect(
      abilities(id).some((clause) => clause.selfGates.some(({ kind }) => kind === 'chance')),
    ).toBe(true)
  })

  it('ships abilities as the only c12 classification authority', () => {
    for (const candidate of jokers) {
      expect(candidate.classification.abilities.length, candidate.id).toBeGreaterThan(0)
      expect(candidate.classification).not.toHaveProperty('effects')
      expect(candidate.classification).not.toHaveProperty('timings')
      expect(candidate.classification).not.toHaveProperty('dependencies')
    }
  })

  it('keeps every clause structurally valid and unambiguous', () => {
    for (const candidate of jokers) {
      const seen = new Set<string>()
      for (const clause of candidate.classification.abilities) {
        expect(JOKER_TIMINGS, candidate.id).toContain(clause.event)
        expect(JOKER_ABILITY_ROLES, candidate.id).toContain(clause.role)
        expect(clause.effects.length, candidate.id).toBeGreaterThan(0)
        expect(new Set(clause.effects).size, candidate.id).toBe(clause.effects.length)
        for (const effect of clause.effects) expect(JOKER_EFFECTS, candidate.id).toContain(effect)

        if (clause.role === 'remove') {
          expect(JOKER_REMOVAL_KINDS, candidate.id).toContain(clause.removal)
        } else {
          expect(clause.removal, candidate.id).toBeUndefined()
        }

        for (const dependency of [...clause.eventFilters, ...clause.externalReads]) {
          expect(dependency.family, candidate.id).not.toBe('none')
          expect(dependency.value, candidate.id).toBeTruthy()
        }
        for (const gate of clause.selfGates) {
          expect(JOKER_SELF_GATE_KINDS, candidate.id).toContain(gate.kind)
          expect(gate.value, candidate.id).toBeTruthy()
          expect(gate.dependency?.family, candidate.id).not.toBe('none')
        }

        const key = JSON.stringify(clause)
        expect(seen.has(key), `${candidate.id} has a duplicate ability clause`).toBe(false)
        seen.add(key)
      }
    }
  })

  it('binds the previously disputed growth abilities to their real events', () => {
    expect(abilities('j_hologram')).toEqual([
      expect.objectContaining({ event: 'hand_scored', role: 'apply', effects: ['x_mult'] }),
      expect.objectContaining({ event: 'card_added', role: 'grow', effects: ['x_mult'] }),
    ])
    expect(abilities('j_trousers')).toEqual([
      expect.objectContaining({ event: 'hand_scored', role: 'apply', effects: ['mult'] }),
      expect.objectContaining({
        event: 'card_played',
        role: 'grow',
        eventFilters: [{ family: 'poker_hand', value: 'two_pair' }],
      }),
    ])
    expect(abilities('j_green_joker').map(({ event, role }) => [event, role])).toEqual([
      ['hand_scored', 'apply'],
      ['card_played', 'grow'],
      ['card_discarded', 'decay'],
    ])
    expect(abilities('j_castle').map(({ event, role }) => [event, role])).toEqual([
      ['hand_scored', 'apply'],
      ['card_discarded', 'grow'],
      ['round_end', 'retarget'],
    ])
    expect(abilities('j_ride_the_bus')).toEqual([
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
    expect(abilities('j_obelisk')).toEqual([
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

  it('separates global history reads from Joker-owned growth', () => {
    expect(abilities('j_fortune_teller')).toEqual([
      expect.objectContaining({
        event: 'hand_scored',
        role: 'apply',
        externalReads: [{ family: 'consumable', value: 'tarot_used_count' }],
      }),
    ])
    expect(abilities('j_throwback')).toEqual([
      expect.objectContaining({
        event: 'hand_scored',
        role: 'apply',
        externalReads: [{ family: 'blind', value: 'skipped_count' }],
      }),
    ])
    expect(abilities('j_satellite')).toEqual([
      expect.objectContaining({
        event: 'round_end',
        role: 'apply',
        externalReads: [{ family: 'consumable', value: 'unique_planets_used' }],
      }),
    ])
    expect(abilities('j_invisible')).toEqual([
      expect.objectContaining({
        event: 'sold',
        role: 'apply',
        externalReads: [{ family: 'joker', value: 'other_random' }],
        selfGates: [
          {
            kind: 'counter',
            value: 'after_2_rounds',
            dependency: { family: 'round', value: 'elapsed_2' },
          },
        ],
      }),
    ])
  })

  it('distinguishes held-card events from ambient held-hand reads', () => {
    expect(abilities('j_blackboard')).toEqual([
      expect.objectContaining({
        event: 'hand_scored',
        eventFilters: [],
        externalReads: [{ family: 'playing_card', value: 'held_clubs_or_spades' }],
      }),
    ])
    expect(abilities('j_baron')).toEqual([
      expect.objectContaining({
        event: 'card_held',
        eventFilters: [{ family: 'playing_card', value: 'held_king' }],
        externalReads: [],
      }),
    ])
  })

  it('records missing removal mechanisms without turning their targets into conditions', () => {
    expect(abilities('j_ceremonial')).toContainEqual(
      expect.objectContaining({
        event: 'blind_selected',
        role: 'remove',
        effects: ['modify:destroy_joker'],
        removal: 'joker',
      }),
    )
    expect(abilities('j_madness')).toContainEqual(
      expect.objectContaining({
        event: 'blind_selected',
        role: 'remove',
        effects: ['modify:destroy_joker'],
        removal: 'joker',
      }),
    )
    expect(abilities('j_vampire')).toContainEqual(
      expect.objectContaining({
        event: 'card_played',
        role: 'remove',
        effects: ['modify:remove_enhancement'],
        removal: 'enhancement',
      }),
    )
  })

  it('derives lifecycle details from clauses instead of a parallel tag table', () => {
    expect(deriveJokerAbilityBehaviors(abilities('j_ride_the_bus'))).toEqual(['growth', 'reset'])
    expect(deriveJokerAbilityBehaviors(abilities('j_campfire'))).toEqual(['growth', 'reset'])
    expect(deriveJokerAbilityBehaviors(abilities('j_popcorn'))).toEqual(['decay'])
    expect(deriveJokerAbilityBehaviors(abilities('j_ramen'))).toEqual(['decay'])
    expect(deriveJokerAbilityBehaviors(abilities('j_selzer'))).toEqual(['decay'])
    expect(deriveJokerAbilityBehaviors(abilities('j_gros_michel'))).toEqual(['self_destruct'])
  })
})

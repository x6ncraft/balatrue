import { describe, expect, it } from 'vitest'

import { jokers } from '../data'
import { getJokerEffects } from './joker-access'
import {
  partialDependencyDetailLabel,
  partialEffectDetailLabel,
  partialTimingDetailLabel,
} from '../ui/labels'
import { compareJokers } from './compare'
import type { GuessComparison } from './types'
import { sameVisibleFeedback } from './visible-feedback'

function comparison(): GuessComparison {
  return {
    guessId: 'j_guess',
    correct: false,
    rarity: { value: 'rare', rank: 3, result: 'exact', direction: null },
    acquisition: { kind: 'shop', shopPrice: 6, result: 'exact', direction: null },
    effects: {
      values: ['generate'],
      matches: ['generate'],
      exactMechanismMatches: [],
      categoryOnlyMatches: ['generate:stone_card'],
      result: 'partial',
    },
    timings: { values: ['round_boundary'], matches: [], result: 'miss' },
    dependencies: {
      values: [{ family: 'cards', value: 'rank:face' }],
      exactMatches: [],
      familyMatches: [{ family: 'cards', value: 'rank:face' }],
      result: 'partial',
    },
  }
}

describe('sameVisibleFeedback', () => {
  it('includes the broad effect match that controls the yellow detail', () => {
    const left = comparison()
    const right = comparison()
    right.effects.matches = []

    expect(sameVisibleFeedback(left, right)).toBe(false)
  })

  it('distinguishes exact and related effect mechanisms shown in a yellow cell', () => {
    const left = comparison()
    const right = comparison()
    right.effects.categoryOnlyMatches = []
    right.effects.exactMechanismMatches = ['generate:stone_card']

    expect(sameVisibleFeedback(left, right)).toBe(false)
  })

  it('includes the trigger families named by the yellow explanation', () => {
    const left = comparison()
    const right = comparison()
    left.timings = {
      values: ['hand_scored', 'round_boundary'],
      matches: ['hand_scored'],
      result: 'partial',
    }
    right.timings = {
      values: ['hand_scored', 'round_boundary'],
      matches: ['round_boundary'],
      result: 'partial',
    }

    expect(sameVisibleFeedback(left, right)).toBe(false)
  })

  it('includes only non-matching same-family dependency details', () => {
    const left = comparison()
    const right = comparison()
    right.dependencies.familyMatches = [{ family: 'cards', value: 'rank:ace' }]

    expect(sameVisibleFeedback(left, right)).toBe(false)
  })

  it('treats exact dependency subsets alike when both show the same directional clue', () => {
    const left = comparison()
    const right = comparison()
    left.dependencies.familyMatches = []
    right.dependencies.familyMatches = []
    left.dependencies.exactMatches = [{ family: 'cards', value: 'rank:face' }]
    right.dependencies.exactMatches = [{ family: 'cards', value: 'rank:ace' }]

    expect(sameVisibleFeedback(left, right)).toBe(true)
  })

  it('compares grouped full-deck conditions as one visible yellow detail', () => {
    const left = comparison()
    const right = comparison()
    left.dependencies.values = [
      { family: 'cards', value: 'card_modifier:steel' },
      { family: 'cards', value: 'deck:full_count' },
    ]
    right.dependencies.values = left.dependencies.values
    left.dependencies.familyMatches = [...left.dependencies.values]
    right.dependencies.exactMatches = [{ family: 'cards', value: 'deck:full_count' }]
    right.dependencies.familyMatches = [{ family: 'cards', value: 'card_modifier:steel' }]

    expect(sameVisibleFeedback(left, right)).toBe(true)
  })

  it('never filters candidates using dependency atoms hidden by the rendered clue', () => {
    for (const guess of jokers) {
      const visibleGroups = new Map<string, GuessComparison>()

      for (const answer of jokers) {
        const current = compareJokers(guess, answer)
        const signature = JSON.stringify({
          rarity: [current.rarity.result, current.rarity.direction],
          acquisition: [current.acquisition.result, current.acquisition.direction],
          effect: [
            current.effects.result,
            current.effects.result === 'partial'
              ? partialEffectDetailLabel(
                  getJokerEffects(guess),
                  current.effects.exactMechanismMatches,
                  current.effects.categoryOnlyMatches,
                  'en',
                )
              : null,
          ],
          timing: [
            current.timings.result,
            current.timings.result === 'partial'
              ? partialTimingDetailLabel(current.timings.values, current.timings.matches, 'en')
              : null,
          ],
          dependency: [
            current.dependencies.result,
            current.dependencies.result === 'partial'
              ? partialDependencyDetailLabel(
                  current.dependencies.values,
                  current.dependencies.exactMatches,
                  current.dependencies.familyMatches,
                  'en',
                )
              : null,
          ],
        })
        const representative = visibleGroups.get(signature)
        if (representative) {
          expect(sameVisibleFeedback(current, representative)).toBe(true)
        } else {
          visibleGroups.set(signature, current)
        }
      }
    }
  })
})

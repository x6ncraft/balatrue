import { describe, expect, it } from 'vitest'

import { jokers } from '../data'
import { dependencyKey } from './joker-access'
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
  it('ignores hidden partial-match internals when the visible cell stays the same', () => {
    const left = comparison()
    const right = comparison()
    right.effects.matches = []
    right.effects.categoryOnlyMatches = []
    right.effects.exactMechanismMatches = ['generate:stone_card']
    right.timings.matches = ['round_boundary']
    right.dependencies.exactMatches = [{ family: 'cards', value: 'rank:face' }]
    right.dependencies.familyMatches = [{ family: 'cards', value: 'rank:ace' }]

    expect(sameVisibleFeedback(left, right)).toBe(true)
  })

  it('distinguishes a visible color change', () => {
    const left = comparison()
    const right = comparison()
    right.effects.result = 'miss'

    expect(sameVisibleFeedback(left, right)).toBe(false)
  })

  it('distinguishes guessed-side values that the board displays', () => {
    const left = comparison()
    const right = comparison()
    right.dependencies.values = [{ family: 'cards', value: 'rank:ace' }]

    expect(sameVisibleFeedback(left, right)).toBe(false)
  })

  it('distinguishes different guessed Jokers even when their broad values match', () => {
    const left = comparison()
    const right = comparison()
    right.guessId = 'j_other_guess'

    expect(sameVisibleFeedback(left, right)).toBe(false)
  })

  it('never filters candidates using answer-side details hidden by the board', () => {
    for (const guess of jokers) {
      const visibleGroups = new Map<string, GuessComparison>()

      for (const answer of jokers) {
        const current = compareJokers(guess, answer)
        const signature = JSON.stringify({
          rarity: [current.rarity.result, current.rarity.direction],
          acquisition: [current.acquisition.result, current.acquisition.direction],
          effect: [current.effects.values, current.effects.result],
          timing: [current.timings.values, current.timings.result],
          dependency: [current.dependencies.values.map(dependencyKey), current.dependencies.result],
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

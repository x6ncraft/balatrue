import { describe, expect, it } from 'vitest'
import { PUBLIC_SITE_URL } from '../site'
import { comparisonToEmoji, formatShareResult } from './share'
import type { GameState, GuessComparison, MatchResult } from './types'

function comparison(
  guessId: string,
  results: [MatchResult, MatchResult, MatchResult, MatchResult, MatchResult],
  correct = false,
): GuessComparison {
  const [rarity, acquisition, effects, timings, dependencies] = results
  return {
    guessId,
    correct,
    rarity: {
      value: 'common',
      rank: 1,
      result: rarity,
      direction: rarity === 'exact' ? null : 'up',
    },
    acquisition: {
      kind: 'shop',
      shopPrice: 5,
      result: acquisition,
      direction: acquisition === 'exact' ? null : 'up',
    },
    effects: { values: ['chips'], matches: effects === 'miss' ? [] : ['chips'], result: effects },
    timings: {
      values: ['passive'],
      matches: timings === 'miss' ? [] : ['passive'],
      result: timings,
    },
    dependencies: {
      values: [{ family: 'cards', value: 'suit:hearts' }],
      exactMatches: dependencies === 'exact' ? [{ family: 'cards', value: 'suit:hearts' }] : [],
      familyMatches: dependencies === 'partial' ? [{ family: 'cards', value: 'suit:hearts' }] : [],
      result: dependencies,
    },
  }
}

const firstGuess = comparison('j_first', ['miss', 'miss', 'partial', 'miss', 'partial'])
const winningGuess = comparison('j_answer', ['exact', 'exact', 'exact', 'exact', 'exact'], true)

describe('share results', () => {
  it('encodes the five comparison dimensions in their stable order', () => {
    expect(comparisonToEmoji(firstGuess)).toBe('⬛⬛🟨⬛🟨')
    expect(comparisonToEmoji(winningGuess)).toBe('🟩🟩🟩🟩🟩')
  })

  it('formats a spoiler-free winning result', () => {
    const state: GameState = {
      version: 2,
      mode: 'daily',
      puzzleKey: '2026-07-18',
      answerId: 'j_answer',
      maxAttempts: 6,
      status: 'won',
      guesses: [firstGuess, winningGuess],
      usedCollection: false,
    }

    expect(formatShareResult(state, { title: 'Name That Joker' })).toBe(
      ['Name That Joker 2026-07-18 2/6', '⬛⬛🟨⬛🟨', '🟩🟩🟩🟩🟩'].join('\n'),
    )
    expect(formatShareResult(state)).not.toContain('j_answer')
  })

  it('uses X for a loss and can append a URL', () => {
    const state: GameState = {
      version: 2,
      mode: 'practice',
      puzzleKey: 'practice:round',
      answerId: 'j_answer',
      maxAttempts: 1,
      status: 'lost',
      guesses: [firstGuess],
      usedCollection: false,
    }

    expect(formatShareResult(state, { url: 'https://example.com' })).toBe(
      ['Balatrue practice:round X/1', '⬛⬛🟨⬛🟨', '', 'https://example.com'].join('\n'),
    )
  })

  it('can append the canonical public game URL', () => {
    const state: GameState = {
      version: 2,
      mode: 'daily',
      puzzleKey: '2026-07-18',
      answerId: 'j_answer',
      maxAttempts: 6,
      status: 'won',
      guesses: [winningGuess],
      usedCollection: false,
    }

    expect(formatShareResult(state, { url: PUBLIC_SITE_URL })).toContain(PUBLIC_SITE_URL)
  })

  it('does not share an unfinished game', () => {
    const state: GameState = {
      version: 2,
      mode: 'daily',
      puzzleKey: '2026-07-18',
      answerId: 'j_answer',
      maxAttempts: 6,
      status: 'playing',
      guesses: [],
      usedCollection: false,
    }

    expect(() => formatShareResult(state)).toThrow('Only completed games can be shared')
  })

  it('marks a collection-assisted result without revealing the answer', () => {
    const state: GameState = {
      version: 2,
      mode: 'daily',
      puzzleKey: '2026-07-18',
      answerId: 'j_answer',
      maxAttempts: 6,
      status: 'won',
      guesses: [winningGuess],
      usedCollection: true,
    }

    expect(formatShareResult(state)).toContain('1/6 🔎')
    expect(formatShareResult(state)).not.toContain('j_answer')
  })
})

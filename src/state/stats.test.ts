import type { GameState } from '../game/types'
import { describe, expect, it } from 'vitest'
import {
  EMPTY_STATS,
  averageWinningGuesses,
  parseStats,
  recordCompletedDailyGame,
  winRate,
} from './stats'

function completed(
  puzzleKey: string,
  status: 'won' | 'lost',
  guesses = 4,
  usedCollection = false,
): GameState {
  return {
    version: 2,
    mode: 'daily',
    puzzleKey,
    answerId: 'j_answer',
    maxAttempts: 6,
    status,
    guesses: Array.from({ length: guesses }, (_, index) => ({
      guessId: `j_${index}`,
      correct: index === guesses - 1 && status === 'won',
      rarity: { value: 'common', rank: 1, result: 'miss', direction: null },
      acquisition: { kind: 'shop', shopPrice: 5, result: 'miss', direction: null },
      effects: { values: [], matches: [], result: 'miss' },
      timings: { values: [], matches: [], result: 'miss' },
      dependencies: { values: [], exactMatches: [], familyMatches: [], result: 'miss' },
    })),
    usedCollection,
  }
}

describe('player stats', () => {
  it('records one result per daily puzzle and advances consecutive wins', () => {
    const first = recordCompletedDailyGame(
      { ...EMPTY_STATS, recordedPuzzles: [] },
      completed('daily:2026-07-18', 'won', 3),
    )
    const duplicate = recordCompletedDailyGame(first, completed('daily:2026-07-18', 'won', 3))
    const second = recordCompletedDailyGame(duplicate, completed('daily:2026-07-19', 'won', 5))

    expect(duplicate).toBe(first)
    expect(second).toMatchObject({ played: 2, wins: 2, currentStreak: 2, maxStreak: 2 })
    expect(winRate(second)).toBe(100)
    expect(averageWinningGuesses(second)).toBe(4)
  })

  it('resets the streak after a loss', () => {
    const won = recordCompletedDailyGame(
      { ...EMPTY_STATS, recordedPuzzles: [] },
      completed('daily:2026-07-18', 'won'),
    )
    const lost = recordCompletedDailyGame(won, completed('daily:2026-07-19', 'lost', 6))
    expect(lost.currentStreak).toBe(0)
    expect(lost.maxStreak).toBe(1)
  })

  it('does not score daily games that used the collection or any practice games', () => {
    const initial = { ...EMPTY_STATS, recordedPuzzles: [] }
    const assisted = recordCompletedDailyGame(
      initial,
      completed('daily:2026-07-18', 'won', 2, true),
    )
    const practice = { ...completed('practice:test', 'won', 1), mode: 'practice' as const }

    expect(assisted).toBe(initial)
    expect(recordCompletedDailyGame(initial, practice)).toBe(initial)
  })

  it('falls back safely when stored data is invalid', () => {
    expect(parseStats('{bad json')).toEqual(EMPTY_STATS)
    expect(parseStats(JSON.stringify({ played: -1 }))).toEqual(EMPTY_STATS)
  })
})

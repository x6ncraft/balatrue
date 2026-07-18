import type { GameState } from '../game/types'

export const STATS_STORAGE_KEY = 'balatrue:stats:v1'

export interface PlayerStats {
  played: number
  wins: number
  currentStreak: number
  maxStreak: number
  totalWinningGuesses: number
  lastDailyDate: string | null
  recordedPuzzles: string[]
}

export const EMPTY_STATS: PlayerStats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  totalWinningGuesses: 0,
  lastDailyDate: null,
  recordedPuzzles: [],
}

function dateKeyFromPuzzle(puzzleKey: string): string | null {
  const match = /(\d{4}-\d{2}-\d{2})/.exec(puzzleKey)
  return match?.[1] ?? null
}

function dayNumber(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  return Math.floor(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) / 86_400_000)
}

export function recordCompletedDailyGame(stats: PlayerStats, state: GameState): PlayerStats {
  if (state.mode !== 'daily' || state.status === 'playing' || state.usedCollection) return stats
  if (stats.recordedPuzzles.includes(state.puzzleKey)) return stats

  const dateKey = dateKeyFromPuzzle(state.puzzleKey)
  const won = state.status === 'won'
  const consecutive =
    won &&
    dateKey !== null &&
    stats.lastDailyDate !== null &&
    dayNumber(dateKey) - dayNumber(stats.lastDailyDate) === 1
  const currentStreak = won ? (consecutive ? stats.currentStreak + 1 : 1) : 0

  return {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    totalWinningGuesses: stats.totalWinningGuesses + (won ? state.guesses.length : 0),
    lastDailyDate: dateKey ?? stats.lastDailyDate,
    recordedPuzzles: [...stats.recordedPuzzles, state.puzzleKey].slice(-180),
  }
}

function isPlayerStats(value: unknown): value is PlayerStats {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<PlayerStats>
  return (
    [
      candidate.played,
      candidate.wins,
      candidate.currentStreak,
      candidate.maxStreak,
      candidate.totalWinningGuesses,
    ].every((item) => typeof item === 'number' && Number.isFinite(item) && item >= 0) &&
    (candidate.lastDailyDate === null || typeof candidate.lastDailyDate === 'string') &&
    Array.isArray(candidate.recordedPuzzles) &&
    candidate.recordedPuzzles.every((item) => typeof item === 'string')
  )
}

export function parseStats(value: string | null): PlayerStats {
  if (!value) return { ...EMPTY_STATS, recordedPuzzles: [] }
  try {
    const parsed: unknown = JSON.parse(value)
    return isPlayerStats(parsed)
      ? { ...parsed, recordedPuzzles: [...parsed.recordedPuzzles] }
      : { ...EMPTY_STATS, recordedPuzzles: [] }
  } catch {
    return { ...EMPTY_STATS, recordedPuzzles: [] }
  }
}

export function winRate(stats: PlayerStats): number {
  return stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100)
}

export function averageWinningGuesses(stats: PlayerStats): number {
  return stats.wins === 0 ? 0 : stats.totalWinningGuesses / stats.wins
}

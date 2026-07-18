import { MAX_ATTEMPTS, type GameState, type GuessComparison, type MatchResult } from './types'

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function isMatchResult(value: unknown): value is MatchResult {
  return value === 'exact' || value === 'partial' || value === 'miss'
}

function isDirection(value: unknown): boolean {
  return value === null || value === 'up' || value === 'down'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isDependencyArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      const dependency = asRecord(item)
      return (
        dependency !== null &&
        typeof dependency.family === 'string' &&
        (dependency.value === undefined || typeof dependency.value === 'string')
      )
    })
  )
}

function isTagComparison(value: unknown): boolean {
  const comparison = asRecord(value)
  return (
    comparison !== null &&
    isStringArray(comparison.values) &&
    isStringArray(comparison.matches) &&
    isMatchResult(comparison.result)
  )
}

function isGuessComparison(value: unknown): value is GuessComparison {
  const comparison = asRecord(value)
  const rarity = asRecord(comparison?.rarity)
  const acquisition = asRecord(comparison?.acquisition)
  const dependencies = asRecord(comparison?.dependencies)

  return (
    comparison !== null &&
    typeof comparison.guessId === 'string' &&
    comparison.guessId.length > 0 &&
    typeof comparison.correct === 'boolean' &&
    rarity !== null &&
    typeof rarity.value === 'string' &&
    typeof rarity.rank === 'number' &&
    isMatchResult(rarity.result) &&
    isDirection(rarity.direction) &&
    acquisition !== null &&
    (acquisition.kind === 'shop' || acquisition.kind === 'soul') &&
    (acquisition.shopPrice === null || typeof acquisition.shopPrice === 'number') &&
    isMatchResult(acquisition.result) &&
    isDirection(acquisition.direction) &&
    isTagComparison(comparison.effects) &&
    isTagComparison(comparison.timings) &&
    dependencies !== null &&
    isDependencyArray(dependencies.values) &&
    isDependencyArray(dependencies.exactMatches) &&
    isDependencyArray(dependencies.familyMatches) &&
    isMatchResult(dependencies.result)
  )
}

export function isGameState(value: unknown): value is GameState {
  const state = asRecord(value)
  if (!state) return false
  if (state.version !== 1) return false
  if (state.mode !== 'daily' && state.mode !== 'practice') return false
  if (typeof state.puzzleKey !== 'string' || state.puzzleKey.length === 0) return false
  if (typeof state.answerId !== 'string' || state.answerId.length === 0) return false
  if (
    typeof state.maxAttempts !== 'number' ||
    !Number.isInteger(state.maxAttempts) ||
    state.maxAttempts < 1 ||
    state.maxAttempts > MAX_ATTEMPTS
  ) {
    return false
  }
  if (state.status !== 'playing' && state.status !== 'won' && state.status !== 'lost') {
    return false
  }
  if (!Array.isArray(state.guesses) || !state.guesses.every(isGuessComparison)) return false
  if (state.guesses.length > state.maxAttempts) return false

  const guessIds = state.guesses.map((guess) => guess.guessId)
  if (new Set(guessIds).size !== guessIds.length) return false
  if (state.guesses.some((guess) => guess.correct !== (guess.guessId === state.answerId))) {
    return false
  }

  const correctCount = state.guesses.filter((guess) => guess.correct).length
  const finalGuess = state.guesses.at(-1)
  if (state.status === 'won' && (correctCount !== 1 || !finalGuess?.correct)) return false
  if (state.status !== 'won' && correctCount !== 0) return false
  if (state.status === 'lost' && state.guesses.length !== state.maxAttempts) return false
  if (state.status === 'playing' && state.guesses.length >= state.maxAttempts) return false

  return true
}

export function serializeGameState(state: GameState): string {
  if (!isGameState(state)) throw new TypeError('Cannot serialize an invalid game state')
  return JSON.stringify(state)
}

export function deserializeGameState(serialized: string): GameState | null {
  try {
    const parsed: unknown = JSON.parse(serialized)
    return isGameState(parsed) ? parsed : null
  } catch {
    return null
  }
}

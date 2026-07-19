import type { GameMode, GameState, GuessComparison, MatchResult } from './types'

const LEGACY_MAX_ATTEMPTS = 8
export const GAME_STORAGE_FALLBACK_CLASSIFICATION_VERSIONS = [7, 6, 5, 4, 3, 2] as const

export type StoredGameContext =
  { mode: 'daily'; puzzleKey: string; answerId: string } | { mode: 'practice' }

export interface RestoreStoredGameOptions {
  currentKey: string
  fallbackKeys: readonly string[]
  context: StoredGameContext
  validJokerIds: ReadonlySet<string>
  read: (key: string) => string | null
  write: (key: string, value: string) => unknown
  refreshFallback: (state: GameState) => GameState | null
}

export function gameStorageKey(
  gameVersion: string,
  classificationVersion: number,
  mode: GameMode,
  puzzleKey?: string,
  clueModelVersion?: number,
): string {
  if (
    clueModelVersion !== undefined &&
    (!Number.isInteger(clueModelVersion) || clueModelVersion < 1)
  ) {
    throw new RangeError('clueModelVersion must be a positive integer')
  }
  const clueSegment = clueModelVersion === undefined ? '' : `:g${clueModelVersion}`
  const prefix = `balatrue:game:${gameVersion}:c${classificationVersion}${clueSegment}:${mode}`
  if (mode === 'practice') return prefix
  if (!puzzleKey) throw new TypeError('Daily game storage keys require a puzzle key')
  return `${prefix}:${puzzleKey}`
}

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

function hasValidGameStateFields(
  state: Record<string, unknown>,
  maxAllowedAttempts: number,
): boolean {
  if (state.mode !== 'daily' && state.mode !== 'practice') return false
  if (typeof state.puzzleKey !== 'string' || state.puzzleKey.length === 0) return false
  if (typeof state.answerId !== 'string' || state.answerId.length === 0) return false
  if (
    typeof state.maxAttempts !== 'number' ||
    !Number.isInteger(state.maxAttempts) ||
    state.maxAttempts < 1 ||
    state.maxAttempts > maxAllowedAttempts
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

export function isGameState(value: unknown): value is GameState {
  const state = asRecord(value)
  return (
    state !== null &&
    state.version === 2 &&
    typeof state.usedCollection === 'boolean' &&
    hasValidGameStateFields(state, LEGACY_MAX_ATTEMPTS)
  )
}

function migrateLegacyGameState(value: unknown): GameState | null {
  const state = asRecord(value)
  if (
    state === null ||
    state.version !== 1 ||
    !hasValidGameStateFields(state, LEGACY_MAX_ATTEMPTS)
  ) {
    return null
  }

  return {
    version: 2,
    mode: state.mode as GameState['mode'],
    puzzleKey: state.puzzleKey as string,
    answerId: state.answerId as string,
    maxAttempts: state.maxAttempts as number,
    status: state.status as GameState['status'],
    guesses: state.guesses as GuessComparison[],
    usedCollection: false,
  }
}

export function serializeGameState(state: GameState): string {
  if (!isGameState(state)) throw new TypeError('Cannot serialize an invalid game state')
  return JSON.stringify(state)
}

export function deserializeGameState(serialized: string): GameState | null {
  try {
    const parsed: unknown = JSON.parse(serialized)
    if (isGameState(parsed)) return parsed
    return migrateLegacyGameState(parsed)
  } catch {
    return null
  }
}

function matchesStoredGameContext(
  state: GameState,
  context: StoredGameContext,
  validJokerIds: ReadonlySet<string>,
): boolean {
  if (state.mode !== context.mode) return false
  if (context.mode === 'daily') {
    if (state.puzzleKey !== context.puzzleKey || state.answerId !== context.answerId) return false
  } else if (!state.puzzleKey.startsWith('practice:')) {
    return false
  }
  if (!validJokerIds.has(state.answerId)) return false
  return state.guesses.every((guess) => validJokerIds.has(guess.guessId))
}

function preservesStoredGameIdentity(source: GameState, refreshed: GameState): boolean {
  return (
    refreshed.mode === source.mode &&
    refreshed.puzzleKey === source.puzzleKey &&
    refreshed.answerId === source.answerId &&
    refreshed.maxAttempts === source.maxAttempts &&
    refreshed.status === source.status &&
    refreshed.usedCollection === source.usedCollection &&
    refreshed.guesses.length === source.guesses.length &&
    refreshed.guesses.every((guess, index) => guess.guessId === source.guesses[index]?.guessId)
  )
}

/**
 * Restores from the current key first, then only from explicitly supplied historical keys.
 * A historical state is refreshed by the caller and written under the current key after
 * schema, context, and identity validation.
 */
export function restoreStoredGame(options: RestoreStoredGameOptions): GameState | null {
  const keys = [options.currentKey, ...options.fallbackKeys]
  for (const key of keys) {
    let serialized: string | null
    try {
      serialized = options.read(key)
    } catch {
      serialized = null
    }
    if (!serialized) continue

    const state = deserializeGameState(serialized)
    if (!state || !matchesStoredGameContext(state, options.context, options.validJokerIds)) {
      continue
    }

    if (key !== options.currentKey) {
      let refreshed: GameState | null
      try {
        refreshed = options.refreshFallback(state)
      } catch {
        refreshed = null
      }
      if (
        !refreshed ||
        !isGameState(refreshed) ||
        !preservesStoredGameIdentity(state, refreshed) ||
        !matchesStoredGameContext(refreshed, options.context, options.validJokerIds)
      ) {
        continue
      }
      try {
        options.write(options.currentKey, serializeGameState(refreshed))
      } catch {
        // The restored in-memory game remains playable when storage is unavailable.
      }
      return refreshed
    }
    return state
  }
  return null
}

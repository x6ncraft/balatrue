import type { Joker } from '../data/types'
import { compareJokers } from './compare'
import { getBeijingDateKey, getDailyAnswer, getPracticeAnswer, type RandomSource } from './daily'
import { getJokerId } from './joker-access'
import { MAX_ATTEMPTS, type GameState } from './types'

export interface CreateGameOptions {
  maxAttempts?: number
}

export interface CreatePracticeGameOptions extends CreateGameOptions {
  puzzleKey?: string
}

function validateMaxAttempts(maxAttempts: number): number {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > MAX_ATTEMPTS) {
    throw new RangeError(`maxAttempts must be an integer between 1 and ${MAX_ATTEMPTS}`)
  }
  return maxAttempts
}

function initialState(
  mode: GameState['mode'],
  puzzleKey: string,
  answer: Joker,
  maxAttempts: number,
): GameState {
  return {
    version: 2,
    mode,
    puzzleKey,
    answerId: getJokerId(answer),
    maxAttempts: validateMaxAttempts(maxAttempts),
    status: 'playing',
    guesses: [],
    usedCollection: false,
  }
}

/** Marks an active game as assisted without mutating the previous state. */
export function markCollectionUsed(state: GameState): GameState {
  if (state.status !== 'playing' || state.usedCollection) return state
  return { ...state, usedCollection: true }
}

export function createDailyGame(
  jokers: readonly Joker[],
  value: Date | number | string = new Date(),
  options: CreateGameOptions = {},
): GameState {
  const answer = getDailyAnswer(jokers, value)
  return initialState(
    'daily',
    getBeijingDateKey(value),
    answer,
    options.maxAttempts ?? MAX_ATTEMPTS,
  )
}

export function createPracticeGame(
  jokers: readonly Joker[],
  random: RandomSource = Math.random,
  options: CreatePracticeGameOptions = {},
): GameState {
  const answer = getPracticeAnswer(jokers, random)
  const answerId = getJokerId(answer)
  return initialState(
    'practice',
    options.puzzleKey ?? `practice:${answerId}`,
    answer,
    options.maxAttempts ?? MAX_ATTEMPTS,
  )
}

export function submitGuess(state: GameState, guess: Joker, answer: Joker): GameState {
  if (state.status !== 'playing') throw new Error('Cannot submit a guess to a completed game')
  if (getJokerId(answer) !== state.answerId) {
    throw new Error('Answer does not match the answer pinned in game state')
  }

  const guessId = getJokerId(guess)
  if (state.guesses.some((record) => record.guessId === guessId)) {
    throw new Error('Joker has already been guessed')
  }

  const comparison = compareJokers(guess, answer)
  const guesses = [...state.guesses, comparison]
  const status = comparison.correct
    ? 'won'
    : guesses.length >= state.maxAttempts
      ? 'lost'
      : 'playing'

  return {
    ...state,
    status,
    guesses,
  }
}

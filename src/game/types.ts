import type { JokerEffect } from '../data/types'
import type { GameDependency, GameEffectValue, GameTimingFamily } from './clue-model'

export type { GameDependency } from './clue-model'

export const MAX_ATTEMPTS = 6 as const

export type MatchResult = 'exact' | 'partial' | 'miss'

/** Direction points from the guessed value toward the answer in the clue's documented order. */
export type Direction = 'up' | 'down'

export type RarityCode = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface RarityComparison {
  value: RarityCode
  rank: number
  result: MatchResult
  direction: Direction | null
}

export interface AcquisitionComparison {
  kind: 'shop' | 'soul'
  shopPrice: number | null
  result: MatchResult
  direction: Direction | null
}

export interface TagComparison<TValue extends string = string> {
  values: TValue[]
  matches: TValue[]
  result: MatchResult
}

export interface EffectComparison extends TagComparison<GameEffectValue> {
  /** Guessed mechanisms that are also present verbatim on the answer. */
  exactMechanismMatches: JokerEffect[]
  /** Guessed mechanisms whose broad effect category exists on the answer, but whose detail differs. */
  categoryOnlyMatches: JokerEffect[]
}

export interface DependencyComparison {
  values: GameDependency[]
  exactMatches: GameDependency[]
  familyMatches: GameDependency[]
  result: MatchResult
}

export interface GuessComparison {
  guessId: string
  correct: boolean
  rarity: RarityComparison
  acquisition: AcquisitionComparison
  effects: EffectComparison
  timings: TagComparison<GameTimingFamily>
  dependencies: DependencyComparison
}

export type GameMode = 'daily' | 'practice'

export type GameStatus = 'playing' | 'won' | 'lost'

export interface GameState {
  version: 2
  mode: GameMode
  puzzleKey: string
  answerId: string
  maxAttempts: number
  status: GameStatus
  guesses: GuessComparison[]
  /** Whether the player opened the Joker collection while this game was in progress. */
  usedCollection: boolean
}

export interface DailyPuzzle<TJoker> {
  dateKey: string
  puzzleNumber: number
  rotationIndex: number
  answer: TJoker
}

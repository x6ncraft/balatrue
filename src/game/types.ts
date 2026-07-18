export const MAX_ATTEMPTS = 6 as const

export type MatchResult = 'exact' | 'partial' | 'miss'

/** Direction always points from the guessed numeric value toward the answer. */
export type Direction = 'up' | 'down'

export type RarityCode = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface GameDependency {
  family: string
  value?: string
}

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

export interface TagComparison {
  values: string[]
  matches: string[]
  result: MatchResult
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
  effects: TagComparison
  timings: TagComparison
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

import type { GameState, GuessComparison, MatchResult } from './types'

export interface ShareResultOptions {
  title?: string
  url?: string
}

const MATCH_EMOJI: Record<MatchResult, string> = {
  exact: '🟩',
  partial: '🟨',
  miss: '⬛',
}

export function comparisonToEmoji(comparison: GuessComparison): string {
  return [
    comparison.rarity.result,
    comparison.acquisition.result,
    comparison.effects.result,
    comparison.timings.result,
    comparison.dependencies.result,
  ]
    .map((result) => MATCH_EMOJI[result])
    .join('')
}

export function formatShareResult(state: GameState, options: ShareResultOptions = {}): string {
  if (state.status === 'playing') throw new Error('Only completed games can be shared')

  const title = options.title ?? 'Balatrue'
  const score = state.status === 'won' ? state.guesses.length : 'X'
  const lines = [
    `${title} ${state.puzzleKey} ${score}/${state.maxAttempts}`,
    ...state.guesses.map(comparisonToEmoji),
  ]
  if (options.url) lines.push('', options.url)
  return lines.join('\n')
}

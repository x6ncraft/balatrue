import type { Joker } from '../data/types'

export const QUICK_START_COUNT = 5

export function pickQuickStartJokers(
  jokers: readonly Joker[],
  excludedIds: Iterable<string> = [],
  count = QUICK_START_COUNT,
  random: () => number = Math.random,
): Joker[] {
  const excluded = new Set(excludedIds)
  const candidates = jokers.filter((joker) => !excluded.has(joker.id))

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = candidates[index]
    const swap = candidates[swapIndex]
    if (current && swap) {
      candidates[index] = swap
      candidates[swapIndex] = current
    }
  }

  return candidates.slice(0, Math.max(0, Math.floor(count)))
}

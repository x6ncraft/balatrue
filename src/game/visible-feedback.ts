import { dependencyKey } from './joker-access'
import type { GuessComparison } from './types'

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  const rightSet = new Set(right)
  return left.length === rightSet.size && left.every((value) => rightSet.has(value))
}

/** Matches exactly what the board exposes: guessed values, color, and numeric direction. */
export function sameVisibleFeedback(left: GuessComparison, right: GuessComparison): boolean {
  return (
    left.guessId === right.guessId &&
    left.rarity.value === right.rarity.value &&
    left.rarity.result === right.rarity.result &&
    left.rarity.direction === right.rarity.direction &&
    left.acquisition.kind === right.acquisition.kind &&
    left.acquisition.shopPrice === right.acquisition.shopPrice &&
    left.acquisition.result === right.acquisition.result &&
    left.acquisition.direction === right.acquisition.direction &&
    sameStringSet(left.effects.values, right.effects.values) &&
    left.effects.result === right.effects.result &&
    sameStringSet(left.timings.values, right.timings.values) &&
    left.timings.result === right.timings.result &&
    sameStringSet(
      left.dependencies.values.map(dependencyKey),
      right.dependencies.values.map(dependencyKey),
    ) &&
    left.dependencies.result === right.dependencies.result
  )
}

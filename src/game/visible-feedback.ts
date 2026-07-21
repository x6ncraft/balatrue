import { gameDependencyDetailUnits } from './clue-model'
import { dependencyKey } from './joker-access'
import type { DependencyComparison, GuessComparison } from './types'

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  const rightSet = new Set(right)
  return left.length === rightSet.size && left.every((value) => rightSet.has(value))
}

function dependencyPartialDetailTokens(comparison: DependencyComparison): string[] {
  if (comparison.result !== 'partial') return []
  if (comparison.values.length > 0 && comparison.exactMatches.length === comparison.values.length) {
    return ['answer-has-more']
  }

  const dependenciesByValue = new Map(
    comparison.values.flatMap((dependency) =>
      dependency.value ? ([[dependency.value, dependency]] as const) : [],
    ),
  )
  const exactKeys = new Set(comparison.exactMatches.map(dependencyKey))
  const relatedKeys = new Set(comparison.familyMatches.map(dependencyKey))

  return gameDependencyDetailUnits([...dependenciesByValue.keys()], true).flatMap((unit) => {
    const dependencies = unit.values.flatMap((value) => {
      const dependency = dependenciesByValue.get(value)
      return dependency ? [dependency] : []
    })
    const keys = dependencies.map(dependencyKey)
    const visibleUnit = unit.group ?? unit.values[0] ?? ''
    if (keys.length > 0 && keys.every((key) => exactKeys.has(key))) {
      return [`exact:${visibleUnit}`]
    }
    if (keys.some((key) => exactKeys.has(key) || relatedKeys.has(key))) {
      return [`different:${visibleUnit}`]
    }
    return []
  })
}

/** Matches exactly what the board exposes, including safe yellow-cell details. */
export function sameVisibleFeedback(left: GuessComparison, right: GuessComparison): boolean {
  return (
    left.rarity.result === right.rarity.result &&
    left.rarity.direction === right.rarity.direction &&
    left.acquisition.result === right.acquisition.result &&
    left.acquisition.direction === right.acquisition.direction &&
    left.effects.result === right.effects.result &&
    sameStringSet(left.effects.matches, right.effects.matches) &&
    sameStringSet(left.effects.exactMechanismMatches, right.effects.exactMechanismMatches) &&
    sameStringSet(left.effects.categoryOnlyMatches, right.effects.categoryOnlyMatches) &&
    left.timings.result === right.timings.result &&
    sameStringSet(left.timings.matches, right.timings.matches) &&
    left.dependencies.result === right.dependencies.result &&
    sameStringSet(
      dependencyPartialDetailTokens(left.dependencies),
      dependencyPartialDetailTokens(right.dependencies),
    )
  )
}

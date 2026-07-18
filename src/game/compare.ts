import type { Joker } from '../data/types'
import {
  dependencyKey,
  getJokerAcquisition,
  getJokerDependencies,
  getJokerEffects,
  getJokerId,
  getJokerRarity,
  getJokerTimings,
} from './joker-access'
import type {
  AcquisitionComparison,
  DependencyComparison,
  Direction,
  GameDependency,
  GuessComparison,
  RarityComparison,
  TagComparison,
} from './types'

function numericDirection(guess: number, answer: number): Direction | null {
  if (guess === answer) return null
  return answer > guess ? 'up' : 'down'
}

function sameSet(left: Set<string>, right: Set<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value))
}

function compareTags(guessValues: string[], answerValues: string[]): TagComparison {
  const guessSet = new Set(guessValues)
  const answerSet = new Set(answerValues)
  const matches = guessValues.filter((value) => answerSet.has(value))

  return {
    values: [...guessValues],
    matches,
    result: sameSet(guessSet, answerSet) ? 'exact' : matches.length > 0 ? 'partial' : 'miss',
  }
}

function compareDependencies(
  guessValues: GameDependency[],
  answerValues: GameDependency[],
): DependencyComparison {
  const guessKeys = new Set(guessValues.map(dependencyKey))
  const answerKeys = new Set(answerValues.map(dependencyKey))
  const exactMatches = guessValues.filter((dependency) => answerKeys.has(dependencyKey(dependency)))
  const familyMatches = guessValues.filter(
    (dependency) =>
      !answerKeys.has(dependencyKey(dependency)) &&
      answerValues.some((answerDependency) => answerDependency.family === dependency.family),
  )

  return {
    values: guessValues.map((dependency) => ({ ...dependency })),
    exactMatches: exactMatches.map((dependency) => ({ ...dependency })),
    familyMatches: familyMatches.map((dependency) => ({ ...dependency })),
    result: sameSet(guessKeys, answerKeys)
      ? 'exact'
      : exactMatches.length > 0 || familyMatches.length > 0
        ? 'partial'
        : 'miss',
  }
}

function compareRarity(guess: Joker, answer: Joker): RarityComparison {
  const guessRarity = getJokerRarity(guess)
  const answerRarity = getJokerRarity(answer)

  return {
    value: guessRarity.code,
    rank: guessRarity.rank,
    result: guessRarity.code === answerRarity.code ? 'exact' : 'miss',
    direction: numericDirection(guessRarity.rank, answerRarity.rank),
  }
}

function compareAcquisition(guess: Joker, answer: Joker): AcquisitionComparison {
  const guessAcquisition = getJokerAcquisition(guess)
  const answerAcquisition = getJokerAcquisition(answer)

  if (guessAcquisition.kind === 'soul' || answerAcquisition.kind === 'soul') {
    return {
      ...guessAcquisition,
      result: guessAcquisition.kind === answerAcquisition.kind ? 'exact' : 'miss',
      direction: null,
    }
  }

  return {
    ...guessAcquisition,
    result: guessAcquisition.shopPrice === answerAcquisition.shopPrice ? 'exact' : 'miss',
    direction: numericDirection(guessAcquisition.shopPrice, answerAcquisition.shopPrice),
  }
}

export function compareJokers(guess: Joker, answer: Joker): GuessComparison {
  return {
    guessId: getJokerId(guess),
    correct: getJokerId(guess) === getJokerId(answer),
    rarity: compareRarity(guess, answer),
    acquisition: compareAcquisition(guess, answer),
    effects: compareTags(getJokerEffects(guess), getJokerEffects(answer)),
    timings: compareTags(getJokerTimings(guess), getJokerTimings(answer)),
    dependencies: compareDependencies(getJokerDependencies(guess), getJokerDependencies(answer)),
  }
}

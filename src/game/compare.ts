import type { Joker, JokerEffect } from '../data/types'
import { gameEffectCategory, type GameTimingFamily } from './clue-model'
import {
  dependencyKey,
  getJokerAcquisition,
  getJokerDependencies,
  getJokerEffects,
  getJokerEffectValues,
  getJokerId,
  getJokerRarity,
  getJokerTimingFamilies,
  getJokerTimings,
} from './joker-access'
import type {
  AcquisitionComparison,
  DependencyComparison,
  Direction,
  EffectComparison,
  GameDependency,
  GuessComparison,
  RarityComparison,
  TagComparison,
} from './types'

function numericDirection(guess: number, answer: number): Direction | null {
  if (guess === answer) return null
  return answer > guess ? 'up' : 'down'
}

function compareEffects(guess: Joker, answer: Joker): EffectComparison {
  const guessMechanisms = getJokerEffects(guess)
  const answerMechanisms = getJokerEffects(answer)
  const guessValues = getJokerEffectValues(guess)
  const answerValues = getJokerEffectValues(answer)
  const answerSet = new Set(answerValues)
  const answerMechanismSet = new Set<JokerEffect>(answerMechanisms)
  const matches = guessValues.filter((value) => answerSet.has(value))
  const exactMechanismMatches = guessMechanisms.filter((effect) => answerMechanismSet.has(effect))
  const categoryOnlyMatches = guessMechanisms.filter(
    (effect) => !answerMechanismSet.has(effect) && answerSet.has(gameEffectCategory(effect)),
  )
  const exactMechanisms = sameSet(new Set(guessMechanisms), new Set(answerMechanisms))

  return {
    values: guessValues,
    matches,
    exactMechanismMatches,
    categoryOnlyMatches,
    result: exactMechanisms ? 'exact' : matches.length > 0 ? 'partial' : 'miss',
  }
}

function sameSet(left: Set<string>, right: Set<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value))
}

function compareTimings(guess: Joker, answer: Joker): TagComparison<GameTimingFamily> {
  const guessTimings = getJokerTimings(guess)
  const answerTimings = getJokerTimings(answer)
  const guessFamilies = getJokerTimingFamilies(guess)
  const answerFamilies = getJokerTimingFamilies(answer)
  const answerFamilySet = new Set(answerFamilies)
  const matches = guessFamilies.filter((family) => answerFamilySet.has(family))

  return {
    values: guessFamilies,
    matches,
    result: sameSet(new Set(guessTimings), new Set(answerTimings))
      ? 'exact'
      : matches.length > 0
        ? 'partial'
        : 'miss',
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

  if (guessAcquisition.kind === 'soul' && answerAcquisition.kind === 'soul') {
    return {
      ...guessAcquisition,
      result: 'exact',
      direction: null,
    }
  }

  if (guessAcquisition.kind === 'soul') {
    return {
      ...guessAcquisition,
      result: 'miss',
      direction: 'down',
    }
  }

  if (answerAcquisition.kind === 'soul') {
    return {
      ...guessAcquisition,
      result: 'miss',
      direction: 'up',
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
    effects: compareEffects(guess, answer),
    timings: compareTimings(guess, answer),
    dependencies: compareDependencies(getJokerDependencies(guess), getJokerDependencies(answer)),
  }
}

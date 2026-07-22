import type { Joker, JokerEffect, JokerRarity, JokerTiming } from '../data/types'
import {
  gameDependencyKey,
  projectJokerDependencies,
  projectJokerEffectDetails,
  projectJokerEffectCategories,
  projectJokerEffectValues,
  projectJokerEffects,
  projectJokerTimingFamilies,
  projectJokerTimings,
  type GameEffectDetail,
  type GameTimingFamily,
  type GameEffectCategory,
  type GameEffectValue,
} from './clue-model'
import type { GameDependency, RarityCode } from './types'

const RARITY_RANK: Record<JokerRarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  legendary: 4,
}

export function getJokerId(joker: Joker): string {
  return joker.id
}

export function getJokerNumber(joker: Joker): number {
  return joker.number
}

export function getJokerName(joker: Joker): { en: string; zhCN: string } {
  return { ...joker.name }
}

export function getJokerRarity(joker: Joker): { code: RarityCode; rank: number } {
  return {
    code: joker.official.rarity,
    rank: RARITY_RANK[joker.official.rarity],
  }
}

export function getJokerAcquisition(
  joker: Joker,
): { kind: 'shop'; shopPrice: number } | { kind: 'soul'; shopPrice: null } {
  const { kind } = joker.classification.acquisition
  if (kind === 'soul') return { kind, shopPrice: null }
  if (joker.official.cost === null) {
    throw new TypeError(`Shop Joker ${joker.id} must have a numeric official cost`)
  }

  return { kind, shopPrice: joker.official.cost }
}

export function getJokerEffects(joker: Joker): JokerEffect[] {
  return projectJokerEffects(joker)
}

export function getJokerEffectDetails(joker: Joker): GameEffectDetail[] {
  return projectJokerEffectDetails(joker)
}

export function getJokerEffectCategories(joker: Joker): GameEffectCategory[] {
  return projectJokerEffectCategories(joker)
}

export function getJokerEffectValues(joker: Joker): GameEffectValue[] {
  return projectJokerEffectValues(joker)
}

export function getJokerTimings(joker: Joker): JokerTiming[] {
  return projectJokerTimings(joker)
}

export function getJokerTimingFamilies(joker: Joker): GameTimingFamily[] {
  return projectJokerTimingFamilies(joker)
}

export function getJokerDependencies(joker: Joker): GameDependency[] {
  return projectJokerDependencies(joker)
}

export function dependencyKey(dependency: GameDependency): string {
  return gameDependencyKey(dependency)
}

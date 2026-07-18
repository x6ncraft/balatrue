import type { Joker, JokerRarity } from '../data/types'
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

export function getJokerEffects(joker: Joker): string[] {
  return [...joker.classification.effects]
}

export function getJokerTimings(joker: Joker): string[] {
  return [...joker.classification.timings]
}

export function getJokerDependencies(joker: Joker): GameDependency[] {
  return joker.classification.dependencies.map((dependency) => ({ ...dependency }))
}

export function dependencyKey(dependency: GameDependency): string {
  return `${dependency.family}\u0000${dependency.value ?? ''}`
}

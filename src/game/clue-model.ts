import type { Joker, JokerDependency, JokerTiming } from '../data/types'

/**
 * Player-facing clue semantics. Raw c8 classifications remain untouched for auditability;
 * this version changes only the smaller vocabulary used for guessing and comparison.
 */
export const GAME_CLUE_MODEL_VERSION = 2 as const

export const GAME_TIMINGS = [
  'always',
  'play',
  'held',
  'discard',
  'blind',
  'shop',
  'round_end',
  'growth',
] as const
export type GameTiming = (typeof GAME_TIMINGS)[number]

export const GAME_DEPENDENCY_FAMILIES = [
  'cards',
  'hand_type',
  'actions',
  'economy',
  'jokers',
  'consumables',
  'progress',
  'none',
] as const
export type GameDependencyFamily = (typeof GAME_DEPENDENCY_FAMILIES)[number]

export interface GameDependency {
  family: GameDependencyFamily
  /** Encodes the audited source family and optional value, for example `suit:hearts`. */
  value?: string
}

const timingProjection: Record<JokerTiming, GameTiming> = {
  passive: 'always',
  hand_scored: 'play',
  card_scored: 'play',
  card_played: 'play',
  card_held: 'held',
  card_discarded: 'discard',
  blind_selected: 'blind',
  shop: 'shop',
  round_end: 'round_end',
  sold: 'shop',
  joker_triggered: 'play',
  mixed: 'growth',
}

const dependencyProjection: Record<JokerDependency['family'], GameDependencyFamily> = {
  suit: 'cards',
  rank: 'cards',
  playing_card: 'cards',
  card_modifier: 'cards',
  deck: 'cards',
  poker_hand: 'hand_type',
  discard: 'actions',
  hand: 'actions',
  money: 'economy',
  shop: 'economy',
  joker: 'jokers',
  joker_slot: 'jokers',
  consumable: 'consumables',
  round: 'progress',
  blind: 'progress',
  none: 'none',
}

const specificPlayingCardFamilies = new Set<JokerDependency['family']>([
  'suit',
  'rank',
  'card_modifier',
])

export function projectJokerTimings(joker: Joker): GameTiming[] {
  const projected = new Set(joker.classification.timings.map((timing) => timingProjection[timing]))
  return GAME_TIMINGS.filter((timing) => projected.has(timing))
}

export function projectJokerDependencies(joker: Joker): GameDependency[] {
  const rawDependencies = joker.classification.dependencies
  const hasSpecificPlayingCardCondition = rawDependencies.some((dependency) =>
    specificPlayingCardFamilies.has(dependency.family),
  )

  const projected = rawDependencies
    .filter(
      (dependency) => dependency.family !== 'playing_card' || !hasSpecificPlayingCardCondition,
    )
    .map<GameDependency>((dependency) => {
      const family = dependencyProjection[dependency.family]
      if (family === 'none') return { family }
      return {
        family,
        value: dependency.value ? `${dependency.family}:${dependency.value}` : dependency.family,
      }
    })

  const unique = new Map(projected.map((dependency) => [gameDependencyKey(dependency), dependency]))
  const familyOrder = new Map(GAME_DEPENDENCY_FAMILIES.map((family, index) => [family, index]))
  return [...unique.values()].sort((left, right) => {
    const familyDifference =
      (familyOrder.get(left.family) ?? 0) - (familyOrder.get(right.family) ?? 0)
    return familyDifference || (left.value ?? '').localeCompare(right.value ?? '', 'en')
  })
}

export function gameDependencyKey(dependency: GameDependency): string {
  return `${dependency.family}\u0000${dependency.value ?? ''}`
}

/** Complete public clue signature used to prevent indistinguishable answers. */
export function gameplayClueSignature(joker: Joker): string {
  const price =
    joker.classification.acquisition.kind === 'soul' ? 'soul' : String(joker.official.cost)
  return [
    joker.official.rarity,
    price,
    [...joker.classification.effects].sort().join('+'),
    projectJokerTimings(joker).join('+'),
    projectJokerDependencies(joker).map(gameDependencyKey).join('+'),
  ].join('|')
}

import {
  JOKER_EFFECTS,
  JOKER_TIMINGS,
  type Joker,
  type JokerDependency,
  type JokerEffect,
  type JokerTiming,
} from '../data/types'

/**
 * Player-facing clue semantics for audited c11 classifications.
 *
 * Families keep the vocabulary approachable. Effects and conditions retain
 * auditable details so related clues can be yellow without making sibling
 * Jokers indistinguishable. Trigger events are projected to player-facing
 * phases before comparison; exact events remain available for explanations.
 */
export const GAME_CLUE_MODEL_VERSION = 8 as const

export const GAME_EFFECT_FAMILIES = [
  'chips',
  'mult',
  'x_mult',
  'economy',
  'retrigger',
  'generate',
  'modify',
  'resource',
  'rules',
] as const
export type GameEffectFamily = (typeof GAME_EFFECT_FAMILIES)[number]

/** Broad effect categories shown on the board and in collection filters. */
export const GAME_EFFECT_CATEGORIES = [
  'chips',
  'mult',
  'x_mult',
  'economy',
  'generate',
  'adjust',
  'mechanic',
] as const
export type GameEffectCategory = (typeof GAME_EFFECT_CATEGORIES)[number]
export type GameEffectValue = GameEffectCategory

export const GAME_TIMING_FAMILIES = [
  'always',
  'hand_scored',
  'card_scored',
  'hand_action',
  'card_management',
  'blind',
  'shop',
  'round_boundary',
] as const
export type GameTimingFamily = (typeof GAME_TIMING_FAMILIES)[number]

/** Exact audited timing events retained for explanations and source review. */
export const GAME_TIMINGS = JOKER_TIMINGS
export type GameTiming = JokerTiming

export const GAME_DEPENDENCY_FAMILIES = [
  'cards',
  'hand',
  'discard',
  'economy',
  'other_cards',
  'progress',
  'none',
] as const
export type GameDependencyFamily = (typeof GAME_DEPENDENCY_FAMILIES)[number]

export interface GameDependency {
  family: GameDependencyFamily
  /** Encodes the audited source family and optional value, for example `suit:hearts`. */
  value?: string
}

export const GAME_DEPENDENCY_DETAIL_GROUPS = [
  {
    key: 'steel_full_deck',
    values: ['card_modifier:steel', 'deck:full_count'],
  },
  {
    key: 'stone_full_deck',
    values: ['card_modifier:stone', 'deck:full_count'],
  },
  {
    key: 'nine_full_deck',
    values: ['rank:9', 'deck:full_count'],
  },
  {
    key: 'first_single_hand',
    values: ['hand:card_count_1', 'hand:first_hand'],
  },
  {
    key: 'first_single_discard',
    values: ['discard:card_count_1', 'discard:first'],
  },
  {
    key: 'all_suits',
    values: ['suit:clubs', 'suit:diamonds', 'suit:hearts', 'suit:spades'],
  },
] as const

export const GAME_DEPENDENCY_PARTIAL_DETAIL_GROUPS = [
  ...GAME_DEPENDENCY_DETAIL_GROUPS,
  {
    key: 'all_consumables',
    values: ['consumable:planet', 'consumable:spectral', 'consumable:tarot'],
  },
] as const

export type GameDependencyDetailGroupKey =
  (typeof GAME_DEPENDENCY_PARTIAL_DETAIL_GROUPS)[number]['key']

export interface GameDependencyDetailUnit {
  readonly values: readonly string[]
  readonly group: GameDependencyDetailGroupKey | null
  readonly order: number
}

/**
 * Groups dependency atoms exactly as the player-facing yellow explanation does.
 * Keeping this projection locale-free lets candidate counts compare only clues
 * that the board actually reveals.
 */
export function gameDependencyDetailUnits(
  values: readonly string[],
  collapseConsumables = false,
): GameDependencyDetailUnit[] {
  const uniqueValues = [...new Set(values)]
  const consumed = new Set<string>()
  const units: GameDependencyDetailUnit[] = []
  const groups = collapseConsumables
    ? GAME_DEPENDENCY_PARTIAL_DETAIL_GROUPS
    : GAME_DEPENDENCY_DETAIL_GROUPS

  for (const group of groups) {
    if (!group.values.every((value) => uniqueValues.includes(value) && !consumed.has(value))) {
      continue
    }
    group.values.forEach((value) => consumed.add(value))
    units.push({
      values: group.values,
      group: group.key,
      order: Math.min(...group.values.map((value) => uniqueValues.indexOf(value))),
    })
  }

  uniqueValues.forEach((value, order) => {
    if (consumed.has(value)) return
    units.push({ values: [value], group: null, order })
  })

  return units.sort((left, right) => left.order - right.order)
}

const effectFamilies = new Set<string>(GAME_EFFECT_FAMILIES)

export function gameEffectFamily(effect: JokerEffect): GameEffectFamily {
  const family = effect.includes(':') ? effect.slice(0, effect.indexOf(':')) : effect
  if (!effectFamilies.has(family)) throw new TypeError(`Unknown game effect family '${family}'`)
  return family as GameEffectFamily
}

const effectCategoryProjection: Record<GameEffectFamily, GameEffectCategory> = {
  chips: 'chips',
  mult: 'mult',
  x_mult: 'x_mult',
  economy: 'economy',
  retrigger: 'mechanic',
  generate: 'generate',
  modify: 'adjust',
  resource: 'adjust',
  rules: 'mechanic',
}

export function gameEffectCategory(effect: JokerEffect): GameEffectCategory {
  return effectCategoryProjection[gameEffectFamily(effect)]
}

const timingProjection: Record<JokerTiming, GameTimingFamily> = {
  passive: 'always',
  hand_scored: 'hand_scored',
  card_scored: 'card_scored',
  card_played: 'hand_action',
  card_held: 'hand_action',
  card_discarded: 'hand_action',
  consumable_used: 'card_management',
  card_added: 'card_management',
  card_destroyed: 'card_management',
  blind_selected: 'blind',
  blind_skipped: 'blind',
  blind_defeated: 'blind',
  blind_failed: 'blind',
  shop: 'shop',
  booster_opened: 'shop',
  booster_skipped: 'shop',
  shop_rerolled: 'shop',
  shop_ended: 'shop',
  round_start: 'round_boundary',
  round_end: 'round_boundary',
  sold: 'shop',
  joker_triggered: 'hand_scored',
}

export function gameTimingFamily(timing: JokerTiming): GameTimingFamily {
  return timingProjection[timing]
}

const dependencyProjection: Record<JokerDependency['family'], GameDependencyFamily> = {
  suit: 'cards',
  rank: 'cards',
  card_modifier: 'cards',
  playing_card: 'cards',
  deck: 'cards',
  poker_hand: 'hand',
  discard: 'discard',
  hand: 'hand',
  money: 'economy',
  shop: 'economy',
  joker: 'other_cards',
  joker_slot: 'other_cards',
  consumable: 'other_cards',
  round: 'progress',
  blind: 'progress',
  none: 'none',
}

function gameDependencyFamily(dependency: JokerDependency): GameDependencyFamily {
  if (dependency.family === 'playing_card' && dependency.value === 'first_scoring') return 'hand'
  return dependencyProjection[dependency.family]
}

export function projectJokerEffects(joker: Joker): JokerEffect[] {
  const selected = new Set(joker.classification.effects)
  return JOKER_EFFECTS.filter((effect) => selected.has(effect))
}

export function projectJokerEffectCategories(joker: Joker): GameEffectCategory[] {
  const selected = new Set(projectJokerEffects(joker).map(gameEffectCategory))
  return GAME_EFFECT_CATEGORIES.filter((category) => selected.has(category))
}

export function projectJokerEffectValues(joker: Joker): GameEffectValue[] {
  return projectJokerEffectCategories(joker)
}

export function projectJokerTimings(joker: Joker): JokerTiming[] {
  const selected = new Set(joker.classification.timings)
  return JOKER_TIMINGS.filter((timing) => selected.has(timing))
}

export function projectJokerTimingFamilies(joker: Joker): GameTimingFamily[] {
  const selected = new Set(projectJokerTimings(joker).map(gameTimingFamily))
  return GAME_TIMING_FAMILIES.filter((family) => selected.has(family))
}

export function projectJokerDependencies(joker: Joker): GameDependency[] {
  const rawDependencies = joker.classification.dependencies

  const projected = rawDependencies.map<GameDependency>((dependency) => {
    const family = gameDependencyFamily(dependency)
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
    projectJokerEffects(joker).join('+'),
    projectJokerTimingFamilies(joker).join('+'),
    projectJokerDependencies(joker).map(gameDependencyKey).join('+'),
  ].join('|')
}

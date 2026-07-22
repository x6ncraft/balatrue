import {
  deriveJokerAbilityBehaviors,
  JOKER_ABILITY_BEHAVIORS,
  JOKER_EFFECTS,
  JOKER_TIMINGS,
  type Joker,
  type JokerAbilityBehavior,
  type JokerDependency,
  type JokerEffect,
  type JokerTiming,
} from '../data/types'

/**
 * Player-facing clue semantics for the current audited ability clauses.
 *
 * Families keep the vocabulary approachable. Effects and checks retain
 * auditable details so related clues can be yellow without making sibling
 * Jokers indistinguishable. Trigger timing deliberately stops at broad phases;
 * exact actions become player checks only when they meaningfully narrow a phase.
 */
export const GAME_CLUE_MODEL_VERSION = 11 as const

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

/** Player-visible lifecycle details derived from audited ability clauses. */
export const GAME_EFFECT_BEHAVIORS = JOKER_ABILITY_BEHAVIORS
export type GameEffectBehavior = JokerAbilityBehavior
export type GameEffectDetail = JokerEffect | `behavior:${GameEffectBehavior}`

export const GAME_TIMING_FAMILIES = [
  'always',
  'hand_scored',
  'card_scored',
  'card_action',
  'blind',
  'shop',
  'round_boundary',
] as const
export type GameTimingFamily = (typeof GAME_TIMING_FAMILIES)[number]

/** Exact audited timing events retained for source review, not player comparison. */
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
    key: 'scoring_face_state',
    values: ['playing_card:no_scoring_face', 'playing_card:scoring_face'],
  },
  {
    key: 'most_played_state',
    values: ['poker_hand:most_played', 'poker_hand:not_most_played'],
  },
  {
    key: 'all_suits',
    values: ['suit:clubs', 'suit:diamonds', 'suit:hearts', 'suit:spades'],
  },
] as const

export const GAME_DEPENDENCY_BOARD_DETAIL_GROUPS = [
  ...GAME_DEPENDENCY_DETAIL_GROUPS,
  {
    key: 'all_consumables',
    values: ['consumable:planet', 'consumable:spectral', 'consumable:tarot'],
  },
] as const

export type GameDependencyDetailGroupKey =
  (typeof GAME_DEPENDENCY_BOARD_DETAIL_GROUPS)[number]['key']

export interface GameDependencyDetailUnit {
  readonly values: readonly string[]
  readonly group: GameDependencyDetailGroupKey | null
  readonly order: number
}

/**
 * Groups dependency atoms into the natural phrases shown beneath the board's
 * broad condition category. Keeping the projection locale-free ensures every
 * feedback color and every reference view use the same detail structure.
 */
export function gameDependencyDetailUnits(
  values: readonly string[],
  collapseConsumables = false,
): GameDependencyDetailUnit[] {
  const uniqueValues = [...new Set(values)]
  const consumed = new Set<string>()
  const units: GameDependencyDetailUnit[] = []
  const groups = collapseConsumables
    ? GAME_DEPENDENCY_BOARD_DETAIL_GROUPS
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

export function gameEffectBehaviorDetail(
  behavior: GameEffectBehavior,
): `behavior:${GameEffectBehavior}` {
  return `behavior:${behavior}`
}

export function isGameEffectBehaviorDetail(
  detail: GameEffectDetail,
): detail is `behavior:${GameEffectBehavior}` {
  return detail.startsWith('behavior:')
}

const timingProjection: Record<JokerTiming, GameTimingFamily> = {
  passive: 'always',
  hand_scored: 'hand_scored',
  card_scored: 'card_scored',
  card_played: 'card_action',
  card_held: 'card_action',
  card_discarded: 'card_action',
  consumable_used: 'card_action',
  card_added: 'card_action',
  card_destroyed: 'card_action',
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

const hiddenCapacityDependencies = new Set([
  'consumable\u0000available_slot',
  'joker_slot\u0000available',
])

const eventDependencyProjection: Partial<
  Record<JokerTiming, { family: GameDependencyFamily; value: string }>
> = {
  card_played: { family: 'hand', value: 'event:card_played' },
  card_held: { family: 'cards', value: 'event:card_held' },
  card_discarded: { family: 'discard', value: 'event:card_discarded' },
  consumable_used: { family: 'other_cards', value: 'event:consumable_used' },
  card_added: { family: 'cards', value: 'event:card_added' },
  card_destroyed: { family: 'cards', value: 'event:card_destroyed' },
  blind_selected: { family: 'progress', value: 'event:blind_selected' },
  blind_skipped: { family: 'progress', value: 'event:blind_skipped' },
  blind_defeated: { family: 'progress', value: 'event:blind_defeated' },
  blind_failed: { family: 'progress', value: 'event:blind_failed' },
  shop: { family: 'economy', value: 'event:shop' },
  booster_opened: { family: 'economy', value: 'event:booster_opened' },
  booster_skipped: { family: 'economy', value: 'event:booster_skipped' },
  shop_rerolled: { family: 'economy', value: 'event:shop_rerolled' },
  shop_ended: { family: 'economy', value: 'event:shop_ended' },
  sold: { family: 'economy', value: 'event:sold' },
  round_start: { family: 'progress', value: 'event:round_start' },
  round_end: { family: 'progress', value: 'event:round_end' },
  joker_triggered: { family: 'other_cards', value: 'event:joker_triggered' },
}

function rawDependencyKey(dependency: JokerDependency): string {
  return `${dependency.family}\u0000${dependency.value ?? ''}`
}

export function projectJokerEffects(joker: Joker): JokerEffect[] {
  const selected = new Set(joker.classification.abilities.flatMap((ability) => ability.effects))
  return JOKER_EFFECTS.filter((effect) => selected.has(effect))
}

export function projectJokerEffectBehaviors(joker: Joker): GameEffectBehavior[] {
  const selected = new Set(deriveJokerAbilityBehaviors(joker.classification.abilities))
  return GAME_EFFECT_BEHAVIORS.filter((behavior) => selected.has(behavior))
}

export function projectJokerEffectDetails(joker: Joker): GameEffectDetail[] {
  return [
    ...projectJokerEffects(joker),
    ...projectJokerEffectBehaviors(joker).map(gameEffectBehaviorDetail),
  ]
}

export function projectJokerEffectCategories(joker: Joker): GameEffectCategory[] {
  const selected = new Set(projectJokerEffects(joker).map(gameEffectCategory))
  return GAME_EFFECT_CATEGORIES.filter((category) => selected.has(category))
}

export function projectJokerEffectValues(joker: Joker): GameEffectValue[] {
  return projectJokerEffectCategories(joker)
}

export function projectJokerTimings(joker: Joker): JokerTiming[] {
  const selected = new Set(joker.classification.abilities.map((ability) => ability.event))
  return JOKER_TIMINGS.filter((timing) => selected.has(timing))
}

export function projectJokerTimingFamilies(joker: Joker): GameTimingFamily[] {
  const selected = new Set(projectJokerTimings(joker).map(gameTimingFamily))
  return GAME_TIMING_FAMILIES.filter((family) => selected.has(family))
}

export function projectJokerDependencies(joker: Joker): GameDependency[] {
  const projected = joker.classification.abilities.flatMap<GameDependency>((ability) => {
    const concreteDependencies = [
      ...ability.eventFilters,
      ...ability.externalReads,
      ...ability.selfGates.flatMap((gate) => (gate.dependency ? [gate.dependency] : [])),
    ].filter(
      (dependency) =>
        dependency.family !== 'none' &&
        !hiddenCapacityDependencies.has(rawDependencyKey(dependency)),
    )

    if (concreteDependencies.length === 0) {
      const eventDependency = eventDependencyProjection[ability.event]
      return eventDependency ? [{ ...eventDependency }] : []
    }

    return concreteDependencies.map<GameDependency>((dependency) => {
      const family = gameDependencyFamily(dependency)
      if (family === 'none') return { family }
      return {
        family,
        value: dependency.value ? `${dependency.family}:${dependency.value}` : dependency.family,
      }
    })
  })

  if (projected.length === 0) return [{ family: 'none' }]

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
    projectJokerEffectDetails(joker).join('+'),
    projectJokerTimingFamilies(joker).join('+'),
    projectJokerDependencies(joker).map(gameDependencyKey).join('+'),
  ].join('|')
}

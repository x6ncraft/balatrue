export const JOKER_DATA_GAME_VERSION = '1.0.1o-FULL' as const
export const JOKER_CLASSIFICATION_VERSION = 12 as const

export const JOKER_RARITIES = ['common', 'uncommon', 'rare', 'legendary'] as const
export type JokerRarity = (typeof JOKER_RARITIES)[number]

export const JOKER_ACQUISITION_KINDS = ['shop', 'soul'] as const
export type JokerAcquisitionKind = (typeof JOKER_ACQUISITION_KINDS)[number]

export const JOKER_UNLOCK_STATES = ['starting', 'unlock_required', 'legendary'] as const
export type JokerUnlockState = (typeof JOKER_UNLOCK_STATES)[number]

export const JOKER_EFFECTS = [
  'chips',
  'mult',
  'x_mult',
  'economy',
  'retrigger',
  'generate:stone_card',
  'generate:tarot',
  'generate:playing_card_copy',
  'generate:spectral',
  'generate:joker',
  'generate:tag',
  'generate:sealed_card',
  'generate:joker_copy',
  'generate:consumable_copy',
  'modify:poker_hand_level',
  'modify:destroy_playing_card',
  'modify:destroy_joker',
  'modify:remove_enhancement',
  'modify:gold_card',
  'resource:reroll',
  'resource:hands',
  'resource:discards',
  'resource:hand_size',
  'rules:poker_hand_size',
  'rules:face_identity',
  'rules:all_cards_score',
  'rules:straight_gap',
  'rules:boss_blind',
  'rules:survival',
  'rules:suit_identity',
  'rules:duplicates',
  'rules:copy_ability',
  'rules:probability',
] as const
export type JokerEffect = (typeof JOKER_EFFECTS)[number]

export const JOKER_TIMINGS = [
  'passive',
  'hand_scored',
  'card_scored',
  'card_played',
  'card_held',
  'card_discarded',
  'consumable_used',
  'card_added',
  'card_destroyed',
  'blind_selected',
  'blind_skipped',
  'blind_defeated',
  'blind_failed',
  'shop',
  'booster_opened',
  'booster_skipped',
  'shop_rerolled',
  'shop_ended',
  'round_start',
  'round_end',
  'sold',
  'joker_triggered',
] as const
export type JokerTiming = (typeof JOKER_TIMINGS)[number]

export const JOKER_DEPENDENCY_FAMILIES = [
  'suit',
  'rank',
  'poker_hand',
  'playing_card',
  'card_modifier',
  'money',
  'joker',
  'consumable',
  'discard',
  'hand',
  'round',
  'blind',
  'shop',
  'deck',
  'joker_slot',
  'none',
] as const
export type JokerDependencyFamily = (typeof JOKER_DEPENDENCY_FAMILIES)[number]

export const WIKI_JOKER_TYPES = [
  'chips',
  'mult',
  'x_mult',
  'chips_and_mult',
  'effect',
  'retrigger',
  'economy',
] as const
export type WikiJokerType = (typeof WIKI_JOKER_TYPES)[number]

export const WIKI_JOKER_ACTIVATIONS = [
  'independent',
  'passive',
  'on_scored',
  'on_held',
  'on_blind_select',
  'on_played',
  'on_discard',
  'on_other_jokers',
  'mixed',
] as const
export type WikiJokerActivation = (typeof WIKI_JOKER_ACTIVATIONS)[number]

export interface LocalizedJokerName {
  en: string
  zhCN: string
}

export interface JokerDependency {
  family: JokerDependencyFamily
  value?: string
}

export const JOKER_ABILITY_ROLES = [
  'apply',
  'grow',
  'decay',
  'reset',
  'retarget',
  'remove',
] as const
export type JokerAbilityRole = (typeof JOKER_ABILITY_ROLES)[number]

export const JOKER_REMOVAL_KINDS = ['self', 'joker', 'playing_card', 'enhancement'] as const
export type JokerRemovalKind = (typeof JOKER_REMOVAL_KINDS)[number]

export const JOKER_SELF_GATE_KINDS = [
  'counter',
  'remaining_uses',
  'chance',
  'score_threshold',
] as const
export type JokerSelfGateKind = (typeof JOKER_SELF_GATE_KINDS)[number]

/**
 * Internal state that controls an ability without being mistaken for an
 * external dependency. `dependency` is present only when the gate is also a
 * useful player-facing clue.
 */
export interface JokerSelfGate {
  kind: JokerSelfGateKind
  value: string
  dependency?: JokerDependency
}

/**
 * One independently triggered part of a Joker's ability.
 *
 * - `eventFilters` narrow the triggering event itself.
 * - `externalReads` are ambient game state read while resolving the ability.
 * - `selfGates` are counters, uses, or chances owned by this ability.
 * - `removal` is valid only for `remove` clauses and names what is removed.
 */
export interface JokerAbilityClause {
  event: JokerTiming
  role: JokerAbilityRole
  effects: readonly JokerEffect[]
  eventFilters: readonly JokerDependency[]
  externalReads: readonly JokerDependency[]
  selfGates: readonly JokerSelfGate[]
  removal?: JokerRemovalKind
}

export const JOKER_ABILITY_BEHAVIORS = [
  'growth',
  'decay',
  'reset',
  'retarget',
  'self_destruct',
] as const
export type JokerAbilityBehavior = (typeof JOKER_ABILITY_BEHAVIORS)[number]

/** Player-facing behavior details are a projection, never a second authority. */
export function deriveJokerAbilityBehaviors(
  abilities: readonly JokerAbilityClause[],
): readonly JokerAbilityBehavior[] {
  const selected = new Set<JokerAbilityBehavior>()
  for (const ability of abilities) {
    if (ability.role === 'grow') selected.add('growth')
    if (ability.role === 'decay') selected.add('decay')
    if (ability.role === 'reset') selected.add('reset')
    if (ability.role === 'retarget') selected.add('retarget')
    if (
      ability.role === 'remove' &&
      ability.removal === 'self' &&
      !ability.selfGates.some(({ kind }) => kind === 'remaining_uses')
    )
      selected.add('self_destruct')
  }
  return JOKER_ABILITY_BEHAVIORS.filter((behavior) => selected.has(behavior))
}

export interface Joker {
  /** Stable Balatro localization key, for example `j_greedy_joker`. */
  id: string
  /** Collection order shown in Balatro's Joker collection, from 1 through 150. */
  number: number
  name: LocalizedJokerName
  /** Root-relative path to the checked-in prototype asset. */
  imagePath: string
  official: {
    gameVersion: typeof JOKER_DATA_GAME_VERSION
    rarity: JokerRarity
    /** Shop purchase price. Legendary Jokers cannot be bought and use `null`. */
    cost: number | null
    shopPurchasable: boolean
  }
  /** Source evidence retained without shipping the full upstream prose in the client. */
  source: {
    effectTextSha256: string
    unlockRequirementSha256: string
    wikiType: WikiJokerType
    wikiActivation: WikiJokerActivation
    /** MediaWiki's SHA-1 for the unoptimised upload. */
    imageSha1: string
    /** SHA-1 of the checked-in PNG (the CDN may losslessly optimise the upload). */
    localImageSha1: string
    imageWidth: number
    imageHeight: number
  }
  /** Versioned, deterministic inference used by the guessing game. */
  classification: {
    version: typeof JOKER_CLASSIFICATION_VERSION
    acquisition: {
      kind: JokerAcquisitionKind
      unlockState: JokerUnlockState
    }
    /** The sole classification authority; all player clues are deterministic projections. */
    abilities: readonly JokerAbilityClause[]
  }
}

export interface JokerDataMeta {
  gameVersion: typeof JOKER_DATA_GAME_VERSION
  classificationVersion: typeof JOKER_CLASSIFICATION_VERSION
  source: {
    wikiPageUrl: string
    wikiPageRevision: number
    enLocalizationUrl: string
    enLocalizationRevision: number
    enLocalizationTimestamp: string
    enLocalizationVersion: string
    zhCNLocalizationUrl: string
    zhCNLocalizationRevision: number
    zhCNLocalizationTimestamp: string
    zhCNLocalizationVersion: string
  }
}

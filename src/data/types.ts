export const JOKER_DATA_GAME_VERSION = '1.0.1o-FULL' as const
export const JOKER_CLASSIFICATION_VERSION = 2 as const

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
  'mechanism',
] as const
export type JokerEffect = (typeof JOKER_EFFECTS)[number]

export const JOKER_TIMINGS = [
  'passive',
  'hand_scored',
  'card_scored',
  'card_played',
  'card_held',
  'card_discarded',
  'blind_selected',
  'shop',
  'round_end',
  'sold',
  'joker_triggered',
  'mixed',
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
  /** Raw source fields retained so generated facts and inferred gameplay tags are auditable. */
  source: {
    wikiPageUrl: string
    effectTextEn: string
    unlockRequirementEn: string
    wikiType: WikiJokerType
    wikiActivation: WikiJokerActivation
    imageUrl: string
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
    effects: readonly JokerEffect[]
    timings: readonly JokerTiming[]
    dependencies: readonly JokerDependency[]
  }
}

export interface JokerDataMeta {
  gameVersion: typeof JOKER_DATA_GAME_VERSION
  classificationVersion: typeof JOKER_CLASSIFICATION_VERSION
  source: {
    wikiPageRevision: number
    enLocalizationRevision: number
    enLocalizationTimestamp: string
    enLocalizationVersion: string
    zhCNLocalizationRevision: number
    zhCNLocalizationTimestamp: string
    zhCNLocalizationVersion: string
  }
}

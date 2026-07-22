import { createHash } from 'node:crypto'

import {
  JOKER_CLASSIFICATION_VERSION,
  JOKER_DATA_GAME_VERSION,
  JOKER_DEPENDENCY_FAMILIES,
  JOKER_EFFECTS,
  JOKER_TIMINGS,
  type Joker,
  type JokerAbilityClause,
  type JokerAbilityRole,
  type JokerDependency,
  type JokerEffect,
  type JokerRarity,
  type JokerRemovalKind,
  type JokerSelfGate,
  type JokerSelfGateKind,
  type JokerTiming,
  type WikiJokerActivation,
  type WikiJokerType,
} from '../src/data/types'

export interface JokerSourceRecord {
  id: string
  number: number
  name: { en: string; zhCN: string }
  referencePageUrl: string
  effectTextEn: string
  unlockRequirementEn: string
  cost: number | null
  rarity: JokerRarity
  wikiType: WikiJokerType
  wikiActivation: WikiJokerActivation
  imageUrl: string
  imageSha1: string
  imageWidth: number
  imageHeight: number
}

interface ClassificationOverride {
  effects?: readonly JokerEffect[]
  timings?: readonly JokerTiming[]
  addTimings?: readonly JokerTiming[]
  dependencies?: readonly JokerDependency[]
  addDependencies?: readonly JokerDependency[]
  removeDependencies?: readonly JokerDependency[]
}

interface AbilityOptions {
  eventFilters?: readonly JokerDependency[]
  externalReads?: readonly JokerDependency[]
  selfGates?: readonly JokerSelfGate[]
  removal?: JokerRemovalKind
}

function dependency(family: JokerDependency['family'], value?: string): JokerDependency {
  return value === undefined ? { family } : { family, value }
}

function selfGate(
  kind: JokerSelfGateKind,
  value: string,
  playerDependency?: JokerDependency,
): JokerSelfGate {
  return playerDependency === undefined
    ? { kind, value }
    : { kind, value, dependency: playerDependency }
}

function ability(
  event: JokerTiming,
  role: JokerAbilityRole,
  effects: readonly JokerEffect[],
  options: AbilityOptions = {},
): JokerAbilityClause {
  return {
    event,
    role,
    effects,
    eventFilters: options.eventFilters ?? [],
    externalReads: options.externalReads ?? [],
    selfGates: options.selfGates ?? [],
    ...(options.removal === undefined ? {} : { removal: options.removal }),
  }
}

/**
 * Audited exceptions for semantics that the Wiki's short prose does not expose
 * reliably to the generic classifiers. This pure table is shared by remote
 * synchronization and the offline generated-data release gate.
 */
const CLASSIFICATION_OVERRIDES: Readonly<Record<string, ClassificationOverride>> = {
  j_half: {
    dependencies: [{ family: 'hand', value: 'card_count_lte_3' }],
  },
  j_stencil: {
    dependencies: [{ family: 'joker_slot', value: 'empty_count' }],
  },
  j_four_fingers: {
    effects: ['rules:poker_hand_size'],
    dependencies: [],
  },
  j_mime: {
    dependencies: [{ family: 'playing_card', value: 'held_ability' }],
  },
  j_credit_card: {
    dependencies: [],
  },
  j_banner: {
    dependencies: [{ family: 'discard', value: 'remaining_count' }],
  },
  j_mystic_summit: {
    dependencies: [{ family: 'discard', value: 'none_remaining' }],
  },
  j_marble: {
    effects: ['generate:stone_card'],
    dependencies: [],
  },
  j_chaos: {
    effects: ['resource:reroll'],
    timings: ['shop'],
    dependencies: [],
  },
  j_abstract: {
    dependencies: [{ family: 'joker', value: 'owned_count' }],
  },
  j_pareidolia: {
    effects: ['rules:face_identity'],
    dependencies: [],
  },
  j_supernova: {
    dependencies: [{ family: 'hand', value: 'played_hand_count' }],
  },
  j_burglar: {
    effects: ['resource:hands', 'resource:discards'],
    dependencies: [],
  },
  j_dna: {
    effects: ['generate:playing_card_copy'],
    dependencies: [
      { family: 'hand', value: 'first_hand' },
      { family: 'hand', value: 'card_count_1' },
    ],
  },
  j_splash: {
    effects: ['rules:all_cards_score'],
    dependencies: [],
  },
  j_blue_joker: {
    dependencies: [{ family: 'deck', value: 'remaining_count' }],
  },
  j_faceless: {
    dependencies: [
      { family: 'rank', value: 'face' },
      { family: 'discard', value: 'card_count_gte_3' },
    ],
  },
  j_superposition: {
    effects: ['generate:tarot'],
    dependencies: [
      { family: 'rank', value: 'ace' },
      { family: 'poker_hand', value: 'straight' },
      { family: 'consumable', value: 'available_slot' },
    ],
  },
  j_card_sharp: {
    dependencies: [{ family: 'poker_hand', value: 'played_before_this_round' }],
  },
  j_seance: {
    effects: ['generate:spectral'],
    dependencies: [
      { family: 'poker_hand', value: 'straight_flush' },
      { family: 'consumable', value: 'available_slot' },
    ],
  },
  j_riff_raff: {
    effects: ['generate:joker'],
    dependencies: [{ family: 'joker_slot', value: 'available' }],
  },
  j_shortcut: {
    effects: ['rules:straight_gap'],
    dependencies: [],
  },
  j_vagabond: {
    effects: ['generate:tarot'],
    dependencies: [
      { family: 'money', value: 'cash_lte_4' },
      { family: 'consumable', value: 'available_slot' },
    ],
  },
  j_baron: {
    dependencies: [{ family: 'playing_card', value: 'held_king' }],
  },
  j_midas_mask: {
    effects: ['modify:gold_card'],
    timings: ['card_scored'],
    dependencies: [{ family: 'rank', value: 'face' }],
  },
  j_photograph: {
    dependencies: [
      { family: 'rank', value: 'face' },
      { family: 'playing_card', value: 'first_scoring' },
    ],
  },
  j_erosion: {
    dependencies: [{ family: 'deck', value: 'below_starting_size' }],
  },
  j_to_the_moon: {
    dependencies: [{ family: 'money', value: 'cash_for_interest' }],
  },
  j_juggler: {
    effects: ['resource:hand_size'],
    dependencies: [],
  },
  j_drunkard: {
    effects: ['resource:discards'],
    dependencies: [],
  },
  j_bull: {
    dependencies: [{ family: 'money', value: 'cash' }],
  },
  j_diet_cola: {
    effects: ['generate:tag'],
    dependencies: [],
  },
  j_swashbuckler: {
    dependencies: [
      { family: 'money', value: 'sell_value' },
      { family: 'joker', value: 'owned' },
    ],
  },
  j_troubadour: {
    effects: ['resource:hand_size', 'resource:hands'],
    dependencies: [],
  },
  j_certificate: {
    effects: ['generate:sealed_card'],
    timings: ['round_start'],
    dependencies: [],
  },
  j_smeared: {
    effects: ['rules:suit_identity'],
    dependencies: [],
  },
  j_hanging_chad: {
    dependencies: [{ family: 'playing_card', value: 'first_scoring' }],
  },
  j_ring_master: {
    effects: ['rules:duplicates'],
    dependencies: [],
  },
  j_flower_pot: {
    dependencies: [
      { family: 'suit', value: 'diamonds' },
      { family: 'suit', value: 'hearts' },
      { family: 'suit', value: 'spades' },
      { family: 'suit', value: 'clubs' },
    ],
  },
  j_blueprint: {
    effects: ['rules:copy_ability'],
    dependencies: [{ family: 'joker', value: 'right' }],
  },
  j_merry_andy: {
    effects: ['resource:discards', 'resource:hand_size'],
    dependencies: [],
  },
  j_oops: {
    effects: ['rules:probability'],
    dependencies: [],
  },
  j_seeing_double: {
    dependencies: [
      { family: 'suit', value: 'clubs' },
      { family: 'suit', value: 'other' },
    ],
  },
  j_matador: {
    dependencies: [{ family: 'blind', value: 'boss_ability_triggered' }],
  },
  j_brainstorm: {
    effects: ['rules:copy_ability'],
    dependencies: [{ family: 'joker', value: 'leftmost' }],
  },
  j_shoot_the_moon: {
    dependencies: [{ family: 'playing_card', value: 'held_queen' }],
  },
  j_cartomancer: {
    effects: ['generate:tarot'],
    dependencies: [{ family: 'consumable', value: 'available_slot' }],
  },
  j_astronomer: {
    effects: ['economy'],
    dependencies: [],
  },
  j_burnt: {
    effects: ['modify:poker_hand_level'],
    dependencies: [{ family: 'discard', value: 'first' }],
  },
  j_bootstraps: {
    dependencies: [{ family: 'money', value: 'cash' }],
  },
  j_chicot: {
    effects: ['rules:boss_blind'],
    dependencies: [],
  },
  j_perkeo: {
    effects: ['generate:consumable_copy'],
    timings: ['shop_ended'],
    dependencies: [{ family: 'consumable', value: 'owned' }],
  },
  j_fibonacci: {
    addDependencies: [
      { family: 'rank', value: 'ace' },
      { family: 'rank', value: '2' },
      { family: 'rank', value: '3' },
      { family: 'rank', value: '5' },
      { family: 'rank', value: '8' },
    ],
  },
  j_acrobat: {
    addDependencies: [{ family: 'hand', value: 'final_hand' }],
  },
  j_hack: {
    addDependencies: [
      { family: 'rank', value: '2' },
      { family: 'rank', value: '3' },
      { family: 'rank', value: '4' },
      { family: 'rank', value: '5' },
    ],
  },
  j_even_steven: {
    removeDependencies: [{ family: 'rank', value: 'any' }],
    addDependencies: [{ family: 'rank', value: 'even' }],
  },
  j_odd_todd: {
    removeDependencies: [{ family: 'rank', value: 'any' }],
    addDependencies: [{ family: 'rank', value: 'odd' }],
  },
  j_walkie_talkie: {
    addDependencies: [
      { family: 'rank', value: '10' },
      { family: 'rank', value: '4' },
    ],
  },
}

/**
 * c12 clauses for Jokers whose abilities cannot be represented by the safe
 * single-clause inference below. These entries bind each condition to the
 * exact event and distinguish external game state from the Joker's own state.
 */
export const C12_ABILITY_OVERRIDES: Readonly<Record<string, readonly JokerAbilityClause[]>> = {
  j_ceremonial: [
    ability('hand_scored', 'apply', ['mult']),
    ability('blind_selected', 'remove', ['modify:destroy_joker'], {
      externalReads: [dependency('joker', 'right')],
      removal: 'joker',
    }),
    ability('blind_selected', 'grow', ['mult'], {
      externalReads: [dependency('joker', 'right'), dependency('money', 'sell_value')],
    }),
  ],
  j_loyalty_card: [
    ability('hand_scored', 'apply', ['x_mult'], {
      selfGates: [selfGate('counter', 'every_6_hands', dependency('hand', 'every_6_hands'))],
    }),
  ],
  j_8_ball: [
    ability('card_scored', 'apply', ['generate:tarot'], {
      eventFilters: [dependency('rank', '8')],
      externalReads: [dependency('consumable', 'available_slot')],
      selfGates: [selfGate('chance', '1_in_4')],
    }),
  ],
  j_gros_michel: [
    ability('hand_scored', 'apply', ['mult']),
    ability('round_end', 'remove', ['mult'], {
      selfGates: [selfGate('chance', '1_in_6')],
      removal: 'self',
    }),
  ],
  j_business: [
    ability('card_scored', 'apply', ['economy'], {
      eventFilters: [dependency('rank', 'face')],
      selfGates: [selfGate('chance', '1_in_2')],
    }),
  ],
  j_raised_fist: [
    ability('card_held', 'apply', ['mult'], {
      externalReads: [dependency('playing_card', 'held_lowest_rank')],
    }),
  ],
  j_blackboard: [
    ability('hand_scored', 'apply', ['x_mult'], {
      externalReads: [dependency('playing_card', 'held_clubs_or_spades')],
    }),
  ],
  j_delayed_grat: [
    ability('round_end', 'apply', ['economy'], {
      externalReads: [dependency('discard', 'none_used')],
    }),
  ],
  j_ride_the_bus: [
    ability('hand_scored', 'apply', ['mult']),
    ability('card_played', 'grow', ['mult'], {
      eventFilters: [dependency('playing_card', 'no_scoring_face')],
    }),
    ability('card_played', 'reset', ['mult'], {
      eventFilters: [dependency('playing_card', 'scoring_face')],
    }),
  ],
  j_space: [
    ability('card_played', 'apply', ['modify:poker_hand_level'], {
      selfGates: [selfGate('chance', '1_in_4')],
    }),
  ],
  j_egg: [ability('round_end', 'grow', ['economy'])],
  j_runner: [
    ability('hand_scored', 'apply', ['chips']),
    ability('card_played', 'grow', ['chips'], {
      eventFilters: [dependency('poker_hand', 'straight')],
    }),
  ],
  j_ice_cream: [
    ability('hand_scored', 'apply', ['chips']),
    ability('card_played', 'decay', ['chips'], {
      selfGates: [selfGate('remaining_uses', '20_hands')],
    }),
    ability('card_played', 'remove', ['chips'], {
      selfGates: [selfGate('remaining_uses', '20_hands')],
      removal: 'self',
    }),
  ],
  j_sixth_sense: [
    ability('card_played', 'remove', ['modify:destroy_playing_card'], {
      eventFilters: [
        dependency('rank', '6'),
        dependency('hand', 'card_count_1'),
        dependency('hand', 'first_hand'),
      ],
      removal: 'playing_card',
    }),
    ability('card_played', 'apply', ['generate:spectral'], {
      eventFilters: [
        dependency('rank', '6'),
        dependency('hand', 'card_count_1'),
        dependency('hand', 'first_hand'),
      ],
      externalReads: [dependency('consumable', 'available_slot')],
    }),
  ],
  j_constellation: [
    ability('hand_scored', 'apply', ['x_mult']),
    ability('consumable_used', 'grow', ['x_mult'], {
      eventFilters: [dependency('consumable', 'planet')],
    }),
  ],
  j_steel_joker: [
    ability('hand_scored', 'apply', ['x_mult'], {
      externalReads: [dependency('card_modifier', 'steel'), dependency('deck', 'full_count')],
    }),
  ],
  j_hiker: [ability('card_scored', 'grow', ['chips'])],
  j_green_joker: [
    ability('hand_scored', 'apply', ['mult']),
    ability('card_played', 'grow', ['mult']),
    ability('card_discarded', 'decay', ['mult']),
  ],
  j_todo_list: [
    ability('card_played', 'apply', ['economy'], {
      eventFilters: [dependency('poker_hand', 'rotating_target')],
    }),
    ability('round_end', 'retarget', ['economy']),
  ],
  j_cavendish: [
    ability('hand_scored', 'apply', ['x_mult']),
    ability('round_end', 'remove', ['x_mult'], {
      selfGates: [selfGate('chance', '1_in_1000')],
      removal: 'self',
    }),
  ],
  j_red_card: [
    ability('hand_scored', 'apply', ['mult']),
    ability('booster_skipped', 'grow', ['mult']),
  ],
  j_madness: [
    ability('hand_scored', 'apply', ['x_mult']),
    ability('blind_selected', 'grow', ['x_mult'], {
      eventFilters: [dependency('blind', 'small_or_big')],
    }),
    ability('blind_selected', 'remove', ['modify:destroy_joker'], {
      eventFilters: [dependency('blind', 'small_or_big')],
      removal: 'joker',
    }),
  ],
  j_square: [
    ability('hand_scored', 'apply', ['chips']),
    ability('card_played', 'grow', ['chips'], {
      eventFilters: [dependency('hand', 'card_count_4')],
    }),
  ],
  j_vampire: [
    ability('hand_scored', 'apply', ['x_mult']),
    ability('card_played', 'grow', ['x_mult'], {
      eventFilters: [dependency('card_modifier', 'enhancement')],
    }),
    ability('card_played', 'remove', ['modify:remove_enhancement'], {
      eventFilters: [dependency('card_modifier', 'enhancement')],
      removal: 'enhancement',
    }),
  ],
  j_hologram: [
    ability('hand_scored', 'apply', ['x_mult']),
    ability('card_added', 'grow', ['x_mult']),
  ],
  j_rocket: [
    ability('round_end', 'apply', ['economy']),
    ability('blind_defeated', 'grow', ['economy'], {
      eventFilters: [dependency('blind', 'boss')],
    }),
  ],
  j_luchador: [
    ability('sold', 'apply', ['rules:boss_blind'], {
      externalReads: [dependency('blind', 'current_boss')],
    }),
  ],
  j_cloud_9: [
    ability('round_end', 'apply', ['economy'], {
      externalReads: [dependency('rank', '9'), dependency('deck', 'full_count')],
    }),
  ],
  j_obelisk: [
    ability('hand_scored', 'apply', ['x_mult']),
    ability('card_played', 'grow', ['x_mult'], {
      eventFilters: [dependency('poker_hand', 'not_most_played')],
    }),
    ability('card_played', 'reset', ['x_mult'], {
      eventFilters: [dependency('poker_hand', 'most_played')],
    }),
  ],
  j_gift: [ability('round_end', 'grow', ['economy'])],
  j_turtle_bean: [
    ability('passive', 'apply', ['resource:hand_size'], {
      selfGates: [selfGate('remaining_uses', '5_rounds')],
    }),
    ability('round_end', 'decay', ['resource:hand_size'], {
      selfGates: [selfGate('remaining_uses', '5_rounds')],
    }),
    ability('round_end', 'remove', ['resource:hand_size'], {
      selfGates: [selfGate('remaining_uses', '5_rounds')],
      removal: 'self',
    }),
  ],
  j_reserved_parking: [
    ability('card_held', 'apply', ['economy'], {
      eventFilters: [dependency('playing_card', 'held_face')],
      selfGates: [selfGate('chance', '1_in_2')],
    }),
  ],
  j_bloodstone: [
    ability('card_scored', 'apply', ['x_mult'], {
      eventFilters: [dependency('suit', 'hearts')],
      selfGates: [selfGate('chance', '1_in_2')],
    }),
  ],
  j_mail: [
    ability('card_discarded', 'apply', ['economy'], {
      eventFilters: [dependency('rank', 'rotating_target')],
    }),
    ability('round_end', 'retarget', ['economy']),
  ],
  j_hallucination: [
    ability('booster_opened', 'apply', ['generate:tarot'], {
      externalReads: [dependency('consumable', 'available_slot')],
      selfGates: [selfGate('chance', '1_in_2')],
    }),
  ],
  j_fortune_teller: [
    ability('hand_scored', 'apply', ['mult'], {
      externalReads: [dependency('consumable', 'tarot_used_count')],
    }),
  ],
  j_lucky_cat: [
    ability('hand_scored', 'apply', ['x_mult']),
    ability('card_scored', 'grow', ['x_mult'], {
      eventFilters: [dependency('card_modifier', 'lucky_triggered')],
    }),
  ],
  j_stone: [
    ability('hand_scored', 'apply', ['chips'], {
      externalReads: [dependency('card_modifier', 'stone'), dependency('deck', 'full_count')],
    }),
  ],
  j_baseball: [
    ability('joker_triggered', 'apply', ['x_mult'], {
      eventFilters: [dependency('joker', 'uncommon')],
    }),
  ],
  j_trading: [
    ability('card_discarded', 'apply', ['economy'], {
      eventFilters: [dependency('discard', 'card_count_1'), dependency('discard', 'first')],
    }),
    ability('card_discarded', 'remove', ['modify:destroy_playing_card'], {
      eventFilters: [dependency('discard', 'card_count_1'), dependency('discard', 'first')],
      removal: 'playing_card',
    }),
  ],
  j_flash: [ability('hand_scored', 'apply', ['mult']), ability('shop_rerolled', 'grow', ['mult'])],
  j_popcorn: [
    ability('hand_scored', 'apply', ['mult'], {
      selfGates: [selfGate('remaining_uses', '5_rounds')],
    }),
    ability('round_end', 'decay', ['mult'], {
      selfGates: [selfGate('remaining_uses', '5_rounds')],
    }),
    ability('round_end', 'remove', ['mult'], {
      selfGates: [selfGate('remaining_uses', '5_rounds')],
      removal: 'self',
    }),
  ],
  j_trousers: [
    ability('hand_scored', 'apply', ['mult']),
    ability('card_played', 'grow', ['mult'], {
      eventFilters: [dependency('poker_hand', 'two_pair')],
    }),
  ],
  j_ancient: [
    ability('card_scored', 'apply', ['x_mult'], {
      eventFilters: [dependency('suit', 'rotating_target')],
    }),
    ability('round_end', 'retarget', ['x_mult']),
  ],
  j_ramen: [
    ability('hand_scored', 'apply', ['x_mult'], {
      selfGates: [selfGate('remaining_uses', '100_discards')],
    }),
    ability('card_discarded', 'decay', ['x_mult'], {
      selfGates: [selfGate('remaining_uses', '100_discards')],
    }),
    ability('card_discarded', 'remove', ['x_mult'], {
      selfGates: [selfGate('remaining_uses', '100_discards')],
      removal: 'self',
    }),
  ],
  j_selzer: [
    ability('card_scored', 'apply', ['retrigger'], {
      selfGates: [selfGate('remaining_uses', '10_hands')],
    }),
    ability('card_played', 'decay', ['retrigger'], {
      selfGates: [selfGate('remaining_uses', '10_hands')],
    }),
    ability('card_played', 'remove', ['retrigger'], {
      selfGates: [selfGate('remaining_uses', '10_hands')],
      removal: 'self',
    }),
  ],
  j_castle: [
    ability('hand_scored', 'apply', ['chips']),
    ability('card_discarded', 'grow', ['chips'], {
      eventFilters: [dependency('suit', 'rotating_target')],
    }),
    ability('round_end', 'retarget', ['chips']),
  ],
  j_campfire: [
    ability('hand_scored', 'apply', ['x_mult']),
    ability('sold', 'grow', ['x_mult']),
    ability('blind_defeated', 'reset', ['x_mult'], {
      eventFilters: [dependency('blind', 'boss')],
    }),
  ],
  j_mr_bones: [
    ability('blind_failed', 'apply', ['rules:survival'], {
      selfGates: [
        selfGate(
          'score_threshold',
          'score_gte_25_percent',
          dependency('blind', 'score_gte_25_percent'),
        ),
      ],
    }),
    ability('blind_failed', 'remove', ['rules:survival'], {
      selfGates: [
        selfGate(
          'score_threshold',
          'score_gte_25_percent',
          dependency('blind', 'score_gte_25_percent'),
        ),
      ],
      removal: 'self',
    }),
  ],
  j_throwback: [
    ability('hand_scored', 'apply', ['x_mult'], {
      externalReads: [dependency('blind', 'skipped_count')],
    }),
  ],
  j_glass: [
    ability('hand_scored', 'apply', ['x_mult']),
    ability('card_destroyed', 'grow', ['x_mult'], {
      eventFilters: [dependency('card_modifier', 'glass')],
    }),
  ],
  j_wee: [
    ability('hand_scored', 'apply', ['chips']),
    ability('card_scored', 'grow', ['chips'], {
      eventFilters: [dependency('rank', '2')],
    }),
  ],
  j_idol: [
    ability('card_scored', 'apply', ['x_mult'], {
      eventFilters: [dependency('suit', 'rotating_target'), dependency('rank', 'rotating_target')],
    }),
    ability('round_end', 'retarget', ['x_mult']),
  ],
  j_hit_the_road: [
    ability('hand_scored', 'apply', ['x_mult']),
    ability('card_discarded', 'grow', ['x_mult'], {
      eventFilters: [dependency('rank', 'jack')],
    }),
    ability('round_end', 'reset', ['x_mult']),
  ],
  j_stuntman: [
    ability('hand_scored', 'apply', ['chips']),
    ability('passive', 'apply', ['resource:hand_size']),
  ],
  j_invisible: [
    ability('sold', 'apply', ['generate:joker_copy'], {
      externalReads: [dependency('joker', 'other_random')],
      selfGates: [selfGate('counter', 'after_2_rounds', dependency('round', 'elapsed_2'))],
    }),
  ],
  j_satellite: [
    ability('round_end', 'apply', ['economy'], {
      externalReads: [dependency('consumable', 'unique_planets_used')],
    }),
  ],
  j_drivers_license: [
    ability('hand_scored', 'apply', ['x_mult'], {
      externalReads: [dependency('card_modifier', 'enhancement_count_gte_16')],
    }),
  ],
  j_caino: [
    ability('hand_scored', 'apply', ['x_mult']),
    ability('card_destroyed', 'grow', ['x_mult'], {
      eventFilters: [dependency('rank', 'face')],
    }),
  ],
  j_yorick: [
    ability('hand_scored', 'apply', ['x_mult']),
    ability('card_discarded', 'grow', ['x_mult'], {
      selfGates: [
        selfGate('counter', 'every_23_discards', dependency('discard', 'history_count_23')),
      ],
    }),
  ],
}

/** Jokers whose clauses received explicit c12 review rather than safe inference. */
export const C12_EXPLICIT_ABILITY_JOKER_IDS = Object.freeze(
  Object.keys(C12_ABILITY_OVERRIDES).sort(),
)

/** Single-clause Jokers that still need a narrow correction before inference. */
export const C12_SAFE_INFERENCE_OVERRIDE_JOKER_IDS = Object.freeze(
  Object.keys(CLASSIFICATION_OVERRIDES).sort(),
)

/**
 * c12 audit manifest. A source sync that adds, removes, or renames a Joker must
 * update this list only after its final clauses have been reviewed.
 */
export const C12_AUDITED_JOKER_IDS = [
  'j_joker',
  'j_greedy_joker',
  'j_lusty_joker',
  'j_wrathful_joker',
  'j_gluttenous_joker',
  'j_jolly',
  'j_zany',
  'j_mad',
  'j_crazy',
  'j_droll',
  'j_sly',
  'j_wily',
  'j_clever',
  'j_devious',
  'j_crafty',
  'j_half',
  'j_stencil',
  'j_four_fingers',
  'j_mime',
  'j_credit_card',
  'j_ceremonial',
  'j_banner',
  'j_mystic_summit',
  'j_marble',
  'j_loyalty_card',
  'j_8_ball',
  'j_misprint',
  'j_dusk',
  'j_raised_fist',
  'j_chaos',
  'j_fibonacci',
  'j_steel_joker',
  'j_scary_face',
  'j_abstract',
  'j_delayed_grat',
  'j_hack',
  'j_pareidolia',
  'j_gros_michel',
  'j_even_steven',
  'j_odd_todd',
  'j_scholar',
  'j_business',
  'j_supernova',
  'j_ride_the_bus',
  'j_space',
  'j_egg',
  'j_burglar',
  'j_blackboard',
  'j_runner',
  'j_ice_cream',
  'j_dna',
  'j_splash',
  'j_blue_joker',
  'j_sixth_sense',
  'j_constellation',
  'j_hiker',
  'j_faceless',
  'j_green_joker',
  'j_superposition',
  'j_todo_list',
  'j_cavendish',
  'j_card_sharp',
  'j_red_card',
  'j_madness',
  'j_square',
  'j_seance',
  'j_riff_raff',
  'j_vampire',
  'j_shortcut',
  'j_hologram',
  'j_vagabond',
  'j_baron',
  'j_cloud_9',
  'j_rocket',
  'j_obelisk',
  'j_midas_mask',
  'j_luchador',
  'j_photograph',
  'j_gift',
  'j_turtle_bean',
  'j_erosion',
  'j_reserved_parking',
  'j_mail',
  'j_to_the_moon',
  'j_hallucination',
  'j_fortune_teller',
  'j_juggler',
  'j_drunkard',
  'j_stone',
  'j_golden',
  'j_lucky_cat',
  'j_baseball',
  'j_bull',
  'j_diet_cola',
  'j_trading',
  'j_flash',
  'j_popcorn',
  'j_trousers',
  'j_ancient',
  'j_ramen',
  'j_walkie_talkie',
  'j_selzer',
  'j_castle',
  'j_smiley',
  'j_campfire',
  'j_ticket',
  'j_mr_bones',
  'j_acrobat',
  'j_sock_and_buskin',
  'j_swashbuckler',
  'j_troubadour',
  'j_certificate',
  'j_smeared',
  'j_throwback',
  'j_hanging_chad',
  'j_rough_gem',
  'j_bloodstone',
  'j_arrowhead',
  'j_onyx_agate',
  'j_glass',
  'j_ring_master',
  'j_flower_pot',
  'j_blueprint',
  'j_wee',
  'j_merry_andy',
  'j_oops',
  'j_idol',
  'j_seeing_double',
  'j_matador',
  'j_hit_the_road',
  'j_duo',
  'j_trio',
  'j_family',
  'j_order',
  'j_tribe',
  'j_stuntman',
  'j_invisible',
  'j_brainstorm',
  'j_satellite',
  'j_shoot_the_moon',
  'j_drivers_license',
  'j_cartomancer',
  'j_astronomer',
  'j_burnt',
  'j_bootstraps',
  'j_caino',
  'j_triboulet',
  'j_yorick',
  'j_chicot',
  'j_perkeo',
] as const

/**
 * Jokers whose c12 player projection differs from c11 through an exact clue,
 * condition cleanup, or a newly visible behavior detail.
 */
export const C12_CHANGED_FROM_C11_JOKER_IDS = [
  'j_ceremonial',
  'j_gros_michel',
  'j_ride_the_bus',
  'j_egg',
  'j_blackboard',
  'j_runner',
  'j_ice_cream',
  'j_constellation',
  'j_hiker',
  'j_green_joker',
  'j_todo_list',
  'j_cavendish',
  'j_red_card',
  'j_madness',
  'j_square',
  'j_vampire',
  'j_hologram',
  'j_rocket',
  'j_obelisk',
  'j_gift',
  'j_turtle_bean',
  'j_mail',
  'j_fortune_teller',
  'j_lucky_cat',
  'j_flash',
  'j_popcorn',
  'j_trousers',
  'j_ancient',
  'j_ramen',
  'j_selzer',
  'j_castle',
  'j_campfire',
  'j_mr_bones',
  'j_throwback',
  'j_glass',
  'j_wee',
  'j_idol',
  'j_hit_the_road',
  'j_invisible',
  'j_satellite',
  'j_caino',
  'j_yorick',
] as const

export function assertKnownJokerClassificationReferences(jokerIds: ReadonlySet<string>): void {
  const explicitAbilityIds = new Set(C12_EXPLICIT_ABILITY_JOKER_IDS)
  for (const id of Object.keys(CLASSIFICATION_OVERRIDES)) {
    if (explicitAbilityIds.has(id)) {
      throw new Error(`[data] Joker '${id}' has both a flat inference and an ability override`)
    }
    if (!jokerIds.has(id))
      throw new Error(`[data] classification override references unknown ID '${id}'`)
  }
  for (const id of C12_EXPLICIT_ABILITY_JOKER_IDS) {
    if (!jokerIds.has(id)) throw new Error(`[data] ability override references unknown ID '${id}'`)
  }
  const audited = new Set<string>(C12_AUDITED_JOKER_IDS)
  for (const id of audited) {
    if (!jokerIds.has(id)) throw new Error(`[data] c12 audit references unknown ID '${id}'`)
  }
  for (const id of jokerIds) {
    if (!audited.has(id))
      throw new Error(`[data] Joker '${id}' is missing from the c12 audit manifest`)
  }
}

function classifyEffects(wikiType: WikiJokerType, text: string): JokerEffect[] {
  const effects = new Set<JokerEffect>()
  const baseEffects: Record<WikiJokerType, readonly JokerEffect[]> = {
    chips: ['chips'],
    mult: ['mult'],
    x_mult: ['x_mult'],
    chips_and_mult: ['chips', 'mult'],
    economy: ['economy'],
    retrigger: ['retrigger'],
    effect: [],
  }
  for (const effect of baseEffects[wikiType]) effects.add(effect)

  if (/retrigger/i.test(text)) effects.add('retrigger')

  return JOKER_EFFECTS.filter((effect) => effects.has(effect))
}

function classifyTimings(activation: WikiJokerActivation, text: string): JokerTiming[] {
  const timings = new Set<JokerTiming>()
  const baseTiming: Record<WikiJokerActivation, JokerTiming | null> = {
    independent: 'hand_scored',
    passive: 'passive',
    on_scored: 'card_scored',
    on_held: 'card_held',
    on_blind_select: 'blind_selected',
    on_played: 'card_played',
    on_discard: 'card_discarded',
    on_other_jokers: 'joker_triggered',
    mixed: null,
  }
  const defaultTiming = baseTiming[activation]
  if (defaultTiming) timings.add(defaultTiming)

  const eventRules: Array<[RegExp, JokerTiming]> = [
    [/when (?:a )?played card is scored|played cards? with|cards? scored/i, 'card_scored'],
    [/held in hand/i, 'card_held'],
    [/when blind is selected|blind is selected/i, 'blind_selected'],
    [/after.*hand played|when hand is played|first hand of round/i, 'card_played'],
    [
      /every time a (?:Planet|Tarot|Spectral) card is used|per (?:Tarot|Planet|Spectral) card used/i,
      'consumable_used',
    ],
    [/playing card is added to your deck/i, 'card_added'],
    [/(?:Glass|face) Card (?:that )?is destroyed|face card is destroyed/i, 'card_destroyed'],
    [/Blind skipped/i, 'blind_skipped'],
    [/Blind is defeated/i, 'blind_defeated'],
    [/when round begins/i, 'round_start'],
    [/end of (?:the )?round|(?:rank|suit|card) changes every round/i, 'round_end'],
    [/Booster Pack is opened|Booster Packs? (?:is|are) opened/i, 'booster_opened'],
    [/Booster Pack is skipped|Booster Packs? (?:is|are) skipped/i, 'booster_skipped'],
    [/\breroll/i, 'shop_rerolled'],
    [/end of (?:the )?shop|leaving the shop/i, 'shop_ended'],
    [/(?:in|per) (?:the )?shop|Packs? in the shop/i, 'shop'],
    [/when (?:this joker is )?sold|sell this card|cards? sold/i, 'sold'],
  ]
  let foundSpecificEvent = false
  for (const [pattern, timing] of eventRules) {
    if (!pattern.test(text)) continue
    foundSpecificEvent = true
    timings.add(timing)
  }

  if (activation === 'passive' && foundSpecificEvent) timings.delete('passive')
  return JOKER_TIMINGS.filter((timing) => timings.has(timing))
}

function classifyDependencies(text: string): JokerDependency[] {
  const dependencies = new Map<string, JokerDependency>()
  const add = (family: JokerDependency['family'], value?: string) => {
    dependencies.set(`${family}:${value ?? ''}`, value ? { family, value } : { family })
  }

  const suits: Array<[RegExp, string]> = [
    [/\bDiamonds?\b/i, 'diamonds'],
    [/\bHearts?\b/i, 'hearts'],
    [/\bSpades?\b/i, 'spades'],
    [/\bClubs?\b/i, 'clubs'],
  ]
  for (const [pattern, value] of suits) if (pattern.test(text)) add('suit', value)
  if (
    /\bsuit\b/i.test(text) &&
    !dependencies.has('suit:diamonds') &&
    !dependencies.has('suit:hearts') &&
    !dependencies.has('suit:spades') &&
    !dependencies.has('suit:clubs')
  )
    add('suit', 'any')

  const ranks: Array<[RegExp, string]> = [
    [/\bAces?\b/i, 'ace'],
    [/\bKings?\b/i, 'king'],
    [/\bQueens?\b/i, 'queen'],
    [/\bJacks?\b/i, 'jack'],
    [/\bface cards?\b/i, 'face'],
    [/\beven ranked\b/i, 'even'],
    [/\bodd ranked\b/i, 'odd'],
    [/\bplayed 2s?\b/i, '2'],
    [/\bplayed 3s?\b/i, '3'],
    [/\bplayed 4s?\b/i, '4'],
    [/\bplayed 5s?\b/i, '5'],
    [/\bplayed 6s?\b/i, '6'],
    [/\bplayed 7s?\b/i, '7'],
    [/\bplayed 8s?\b/i, '8'],
    [/\bplayed 9s?\b/i, '9'],
    [/\bplayed 10s?\b/i, '10'],
  ]
  for (const [pattern, value] of ranks) if (pattern.test(text)) add('rank', value)
  if (/\brank\b/i.test(text) && ![...dependencies.values()].some((tag) => tag.family === 'rank'))
    add('rank', 'any')

  const pokerHands: Array<[RegExp, string]> = [
    [/\bFlush Five\b/i, 'flush_five'],
    [/\bFlush House\b/i, 'flush_house'],
    [/\bFive of a Kind\b/i, 'five_of_a_kind'],
    [/\bFour of a Kind\b/i, 'four_of_a_kind'],
    [/\bFull House\b/i, 'full_house'],
    [/\bThree of a Kind\b/i, 'three_of_a_kind'],
    [/\bTwo Pair\b/i, 'two_pair'],
    [/\bHigh Card\b/i, 'high_card'],
    [/\bStraight(?:s)?\b/i, 'straight'],
    [/\bFlush(?:es)?\b/i, 'flush'],
  ]
  for (const [pattern, value] of pokerHands) if (pattern.test(text)) add('poker_hand', value)
  if (/\bPair\b/i.test(text.replace(/\bTwo Pair\b/gi, ''))) add('poker_hand', 'pair')
  if (
    /\bpoker hand\b/i.test(text) &&
    ![...dependencies.values()].some((tag) => tag.family === 'poker_hand')
  )
    add('poker_hand', 'any')

  const specificEnhancements: Array<[RegExp, string]> = [
    [/\bStone Cards?\b/i, 'stone'],
    [/\bSteel Cards?\b/i, 'steel'],
    [/\bGold Cards?\b/i, 'gold'],
    [/\bLucky Cards?\b/i, 'lucky'],
    [/\bGlass Cards?\b/i, 'glass'],
  ]
  for (const [pattern, value] of specificEnhancements) {
    if (pattern.test(text)) add('card_modifier', value)
  }
  if (/enhanced cards?|Bonus Cards?|Mult Cards?|Wild Cards?/i.test(text))
    add('card_modifier', 'enhancement')
  if (/\bedition\b|Negative|Foil|Holographic|Polychrome/i.test(text))
    add('card_modifier', 'edition')
  if (/\bseal\b/i.test(text)) add('card_modifier', 'seal')
  if (
    /(?:if|when|while).{0,30}(?:\$\d+|money)|money held|sell value|(?:per|every) \$|based on.{0,20}money|\$\d+ or (?:less|more)|at most \$|interest|debt/i.test(
      text,
    )
  )
    add('money')
  if (/Joker to the right/i.test(text)) add('joker', 'right')
  else if (/leftmost Joker/i.test(text)) add('joker', 'leftmost')
  else if (
    /other Jokers?|random Joker|each Joker|every Joker|owned Jokers?|create \d+ [A-Za-z ]*Jokers?|^Joker,|copies ability/i.test(
      text,
    )
  )
    add('joker')
  if (/Joker slots?|Joker slot/i.test(text)) add('joker_slot')
  if (/\bTarot\b/i.test(text)) add('consumable', 'tarot')
  if (/\bPlanet\b/i.test(text)) add('consumable', 'planet')
  if (/\bSpectral\b|Soul card/i.test(text)) add('consumable', 'spectral')
  if (/\bconsumable\b/i.test(text)) add('consumable', 'any')
  if (/\bdiscard/i.test(text)) add('discard')
  if (/\bhand size\b/i.test(text)) add('hand', 'hand_size')
  if (/hands? remaining|hands? per round|[+-]\d+ hands? each round/i.test(text))
    add('hand', 'hands_per_round')
  if (/played hand contains \d+ or fewer cards/i.test(text)) add('hand', 'card_count')
  if (
    /first (?:hand|discard) of (?:the )?round (?:has only \d+ cards?|is a single [A-Za-z0-9]+)/i.test(
      text,
    )
  )
    add('hand', 'card_count')
  if (/\bhand played\b/i.test(text)) add('hand', 'played_hands')
  if (/\bfirst hand of (?:the )?round\b/i.test(text)) add('hand', 'first_hand')
  if (/\bfinal hand of (?:the )?round\b/i.test(text)) add('hand', 'final_hand')
  if (/\bnext \d+ hands?\b/i.test(text)) add('hand', 'played_hands')
  if (
    /per round played|(?:gains?|loses?|reduces?|increases?|decreases?).{0,30}(?:per|each) round|after \d+ rounds?/i.test(
      text,
    )
  )
    add('round')
  if (/\bBlind\b/i.test(text)) add('blind')
  if (/\bshop\b|Booster Pack|reroll/i.test(text)) add('shop')
  if (/\bdeck\b/i.test(text)) add('deck')

  if (dependencies.size === 0) add('none')
  const familyOrder = new Map(JOKER_DEPENDENCY_FAMILIES.map((family, index) => [family, index]))
  return [...dependencies.values()].sort((left, right) => {
    const familyDifference =
      (familyOrder.get(left.family) ?? 0) - (familyOrder.get(right.family) ?? 0)
    return familyDifference || (left.value ?? '').localeCompare(right.value ?? '', 'en')
  })
}

function dependencyKey({ family, value }: JokerDependency): string {
  return `${family}:${value ?? ''}`
}

function applyClassificationOverride(
  id: string,
  inferredEffects: readonly JokerEffect[],
  inferredTimings: readonly JokerTiming[],
  inferredDependencies: readonly JokerDependency[],
): { effects: JokerEffect[]; timings: JokerTiming[]; dependencies: JokerDependency[] } {
  const override = CLASSIFICATION_OVERRIDES[id]
  const effectSet = new Set(override?.effects ?? inferredEffects)
  const effects = JOKER_EFFECTS.filter((effect) => effectSet.has(effect))
  const timingSet = new Set(override?.timings ?? inferredTimings)
  for (const timing of override?.addTimings ?? []) timingSet.add(timing)
  const timings = JOKER_TIMINGS.filter((timing) => timingSet.has(timing))
  const dependencies = new Map(
    (override?.dependencies ?? inferredDependencies).map((dependency) => [
      dependencyKey(dependency),
      dependency,
    ]),
  )

  for (const dependency of override?.removeDependencies ?? []) {
    dependencies.delete(dependencyKey(dependency))
  }
  for (const dependency of override?.addDependencies ?? []) {
    dependencies.set(dependencyKey(dependency), dependency)
  }
  if ([...dependencies.values()].some(({ family }) => family !== 'none')) {
    dependencies.delete('none:')
  }
  if (dependencies.size === 0) dependencies.set('none:', { family: 'none' })

  const familyOrder = new Map(JOKER_DEPENDENCY_FAMILIES.map((family, index) => [family, index]))
  return {
    effects,
    timings,
    dependencies: [...dependencies.values()].sort((left, right) => {
      const familyDifference =
        (familyOrder.get(left.family) ?? 0) - (familyOrder.get(right.family) ?? 0)
      return familyDifference || (left.value ?? '').localeCompare(right.value ?? '', 'en')
    }),
  }
}

function dependencyIsExternalRead(event: JokerTiming, dependencyValue: JokerDependency): boolean {
  if (dependencyValue.family === 'none') return false
  if (
    dependencyValue.family === 'money' ||
    dependencyValue.family === 'joker' ||
    dependencyValue.family === 'consumable' ||
    dependencyValue.family === 'shop' ||
    dependencyValue.family === 'deck' ||
    dependencyValue.family === 'joker_slot'
  )
    return true
  if (
    dependencyValue.family === 'discard' &&
    ['remaining_count', 'none_remaining'].includes(dependencyValue.value ?? '') &&
    event !== 'card_discarded'
  )
    return true
  if (
    dependencyValue.family === 'hand' &&
    ['played_hand_count', 'played_hands'].includes(dependencyValue.value ?? '')
  )
    return true
  return false
}

function createDefaultAbilities(classification: {
  effects: readonly JokerEffect[]
  timings: readonly JokerTiming[]
  dependencies: readonly JokerDependency[]
}): readonly JokerAbilityClause[] {
  return classification.timings.map((event) => {
    const usefulDependencies = classification.dependencies.filter(({ family }) => family !== 'none')
    return ability(event, 'apply', classification.effects, {
      eventFilters: usefulDependencies.filter(
        (dependencyValue) => !dependencyIsExternalRead(event, dependencyValue),
      ),
      externalReads: usefulDependencies.filter((dependencyValue) =>
        dependencyIsExternalRead(event, dependencyValue),
      ),
    })
  })
}

function sha256Text(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function createJokerFromSource(source: JokerSourceRecord, localImageSha1: string): Joker {
  const legendary = source.rarity === 'legendary'
  const explicitAbilities = C12_ABILITY_OVERRIDES[source.id]
  const abilities =
    explicitAbilities ??
    createDefaultAbilities(
      applyClassificationOverride(
        source.id,
        classifyEffects(source.wikiType, source.effectTextEn),
        classifyTimings(source.wikiActivation, source.effectTextEn),
        classifyDependencies(source.effectTextEn),
      ),
    )

  return {
    id: source.id,
    number: source.number,
    name: source.name,
    imagePath: `/jokers/${source.id}.png`,
    official: {
      gameVersion: JOKER_DATA_GAME_VERSION,
      rarity: source.rarity,
      cost: source.cost,
      shopPurchasable: !legendary,
    },
    source: {
      effectTextSha256: sha256Text(source.effectTextEn),
      unlockRequirementSha256: sha256Text(source.unlockRequirementEn),
      wikiType: source.wikiType,
      wikiActivation: source.wikiActivation,
      imageSha1: source.imageSha1,
      localImageSha1,
      imageWidth: source.imageWidth,
      imageHeight: source.imageHeight,
    },
    classification: {
      version: JOKER_CLASSIFICATION_VERSION,
      acquisition: {
        kind: legendary ? 'soul' : 'shop',
        unlockState: legendary
          ? 'legendary'
          : source.unlockRequirementEn === 'Available from start.'
            ? 'starting'
            : 'unlock_required',
      },
      abilities,
    },
  }
}

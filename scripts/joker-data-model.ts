import { createHash } from 'node:crypto'

import {
  JOKER_CLASSIFICATION_VERSION,
  JOKER_DATA_GAME_VERSION,
  JOKER_DEPENDENCY_FAMILIES,
  JOKER_EFFECTS,
  JOKER_TIMINGS,
  type Joker,
  type JokerDependency,
  type JokerEffect,
  type JokerRarity,
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
  j_ceremonial: {
    dependencies: [
      { family: 'money', value: 'sell_value' },
      { family: 'joker', value: 'right' },
    ],
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
  j_loyalty_card: {
    dependencies: [{ family: 'hand', value: 'every_6_hands' }],
  },
  j_8_ball: {
    effects: ['generate:tarot'],
    dependencies: [
      { family: 'rank', value: '8' },
      { family: 'consumable', value: 'available_slot' },
    ],
  },
  j_raised_fist: {
    dependencies: [{ family: 'playing_card', value: 'held_lowest_rank' }],
  },
  j_chaos: {
    effects: ['resource:reroll'],
    timings: ['shop'],
    dependencies: [],
  },
  j_steel_joker: {
    dependencies: [
      { family: 'card_modifier', value: 'steel' },
      { family: 'deck', value: 'full_count' },
    ],
  },
  j_abstract: {
    dependencies: [{ family: 'joker', value: 'owned_count' }],
  },
  j_delayed_grat: {
    dependencies: [{ family: 'discard', value: 'none_used' }],
  },
  j_pareidolia: {
    effects: ['rules:face_identity'],
    dependencies: [],
  },
  j_supernova: {
    dependencies: [{ family: 'hand', value: 'played_hand_count' }],
  },
  j_ride_the_bus: {
    addTimings: ['hand_scored'],
    dependencies: [
      { family: 'rank', value: 'face' },
      { family: 'hand', value: 'consecutive_without_face' },
    ],
  },
  j_space: {
    effects: ['modify:poker_hand_level'],
    dependencies: [],
  },
  j_egg: {
    dependencies: [],
  },
  j_burglar: {
    effects: ['resource:hands', 'resource:discards'],
    dependencies: [],
  },
  j_blackboard: {
    dependencies: [{ family: 'playing_card', value: 'held_clubs_or_spades' }],
  },
  j_ice_cream: {
    dependencies: [{ family: 'hand', value: 'played_hand_count' }],
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
  j_sixth_sense: {
    effects: ['generate:spectral', 'modify:destroy_playing_card'],
    dependencies: [
      { family: 'rank', value: '6' },
      { family: 'hand', value: 'first_hand' },
      { family: 'hand', value: 'card_count_1' },
      { family: 'consumable', value: 'available_slot' },
    ],
  },
  j_constellation: {
    timings: ['hand_scored', 'consumable_used'],
    dependencies: [{ family: 'consumable', value: 'planet_used_count' }],
  },
  j_faceless: {
    dependencies: [
      { family: 'rank', value: 'face' },
      { family: 'discard', value: 'card_count_gte_3' },
    ],
  },
  j_green_joker: {
    timings: ['hand_scored', 'card_discarded'],
    dependencies: [
      { family: 'hand', value: 'played_hand_count' },
      { family: 'discard', value: 'used_count' },
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
  j_todo_list: {
    dependencies: [{ family: 'poker_hand', value: 'rotating_target' }],
  },
  j_card_sharp: {
    dependencies: [{ family: 'poker_hand', value: 'played_before_this_round' }],
  },
  j_red_card: {
    timings: ['hand_scored', 'booster_skipped'],
    dependencies: [],
  },
  j_madness: {
    dependencies: [{ family: 'blind', value: 'small_or_big' }],
  },
  j_square: {
    timings: ['hand_scored'],
    dependencies: [{ family: 'hand', value: 'card_count_4' }],
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
  j_hologram: {
    timings: ['hand_scored', 'card_added'],
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
  j_cloud_9: {
    dependencies: [
      { family: 'rank', value: '9' },
      { family: 'deck', value: 'full_count' },
    ],
  },
  j_rocket: {
    timings: ['blind_defeated', 'round_end'],
    dependencies: [{ family: 'blind', value: 'boss_defeated_count' }],
  },
  j_obelisk: {
    addTimings: ['hand_scored'],
    dependencies: [
      { family: 'poker_hand', value: 'most_played' },
      { family: 'hand', value: 'consecutive_plays' },
    ],
  },
  j_midas_mask: {
    effects: ['modify:gold_card'],
    timings: ['card_scored'],
    dependencies: [{ family: 'rank', value: 'face' }],
  },
  j_luchador: {
    effects: ['rules:boss_blind'],
    dependencies: [{ family: 'blind', value: 'current_boss' }],
  },
  j_photograph: {
    dependencies: [
      { family: 'rank', value: 'face' },
      { family: 'playing_card', value: 'first_scoring' },
    ],
  },
  j_gift: {
    dependencies: [],
  },
  j_turtle_bean: {
    effects: ['resource:hand_size'],
    timings: ['passive', 'round_end'],
    dependencies: [{ family: 'round', value: 'elapsed' }],
  },
  j_erosion: {
    dependencies: [{ family: 'deck', value: 'below_starting_size' }],
  },
  j_reserved_parking: {
    dependencies: [{ family: 'playing_card', value: 'held_face' }],
  },
  j_mail: {
    dependencies: [{ family: 'rank', value: 'rotating_target' }],
  },
  j_to_the_moon: {
    dependencies: [{ family: 'money', value: 'cash_for_interest' }],
  },
  j_hallucination: {
    effects: ['generate:tarot'],
    timings: ['booster_opened'],
    dependencies: [{ family: 'consumable', value: 'available_slot' }],
  },
  j_fortune_teller: {
    timings: ['hand_scored', 'consumable_used'],
    dependencies: [{ family: 'consumable', value: 'tarot_used_count' }],
  },
  j_juggler: {
    effects: ['resource:hand_size'],
    dependencies: [],
  },
  j_drunkard: {
    effects: ['resource:discards'],
    dependencies: [],
  },
  j_stone: {
    dependencies: [
      { family: 'card_modifier', value: 'stone' },
      { family: 'deck', value: 'full_count' },
    ],
  },
  j_lucky_cat: {
    timings: ['hand_scored', 'card_scored'],
    dependencies: [{ family: 'card_modifier', value: 'lucky_triggered' }],
  },
  j_baseball: {
    dependencies: [{ family: 'joker', value: 'uncommon' }],
  },
  j_bull: {
    dependencies: [{ family: 'money', value: 'cash' }],
  },
  j_diet_cola: {
    effects: ['generate:tag'],
    dependencies: [],
  },
  j_trading: {
    effects: ['economy', 'modify:destroy_playing_card'],
    dependencies: [
      { family: 'discard', value: 'first' },
      { family: 'discard', value: 'card_count_1' },
    ],
  },
  j_flash: {
    timings: ['hand_scored', 'shop_rerolled'],
    dependencies: [{ family: 'shop', value: 'reroll_count' }],
  },
  j_popcorn: {
    timings: ['hand_scored', 'round_end'],
    dependencies: [{ family: 'round', value: 'played_count' }],
  },
  j_ancient: {
    dependencies: [{ family: 'suit', value: 'rotating_target' }],
  },
  j_ramen: {
    timings: ['hand_scored', 'card_discarded'],
    dependencies: [{ family: 'discard', value: 'used_count' }],
  },
  j_selzer: {
    dependencies: [{ family: 'hand', value: 'next_10_hands' }],
  },
  j_castle: {
    timings: ['hand_scored', 'card_discarded', 'round_end'],
    dependencies: [
      { family: 'suit', value: 'rotating_target' },
      { family: 'discard', value: 'matching_count' },
    ],
  },
  j_campfire: {
    timings: ['hand_scored', 'blind_defeated', 'sold'],
    dependencies: [
      { family: 'blind', value: 'boss' },
      { family: 'shop', value: 'sold_card_count' },
    ],
  },
  j_mr_bones: {
    effects: ['rules:survival'],
    timings: ['blind_failed'],
    dependencies: [{ family: 'blind', value: 'score_gte_25_percent' }],
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
  j_throwback: {
    addTimings: ['blind_skipped'],
    dependencies: [{ family: 'blind', value: 'skipped_count' }],
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
  j_idol: {
    dependencies: [
      { family: 'suit', value: 'rotating_target' },
      { family: 'rank', value: 'rotating_target' },
    ],
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
  j_hit_the_road: {
    timings: ['hand_scored', 'card_discarded', 'round_end'],
    dependencies: [
      { family: 'rank', value: 'jack' },
      { family: 'discard', value: 'jack_count_this_round' },
    ],
  },
  j_stuntman: {
    effects: ['chips', 'resource:hand_size'],
    timings: ['hand_scored', 'passive'],
    dependencies: [],
  },
  j_invisible: {
    effects: ['generate:joker_copy'],
    timings: ['round_end', 'sold'],
    dependencies: [
      { family: 'joker', value: 'other_random' },
      { family: 'round', value: 'elapsed_2' },
    ],
  },
  j_brainstorm: {
    effects: ['rules:copy_ability'],
    dependencies: [{ family: 'joker', value: 'leftmost' }],
  },
  j_satellite: {
    timings: ['consumable_used', 'round_end'],
    dependencies: [{ family: 'consumable', value: 'unique_planets_used' }],
  },
  j_shoot_the_moon: {
    dependencies: [{ family: 'playing_card', value: 'held_queen' }],
  },
  j_drivers_license: {
    dependencies: [{ family: 'card_modifier', value: 'enhancement_count_gte_16' }],
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
  j_yorick: {
    timings: ['hand_scored', 'card_discarded'],
    dependencies: [{ family: 'discard', value: 'history_count_23' }],
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
  j_glass: {
    addTimings: ['hand_scored', 'card_destroyed'],
  },
  j_runner: {
    addTimings: ['hand_scored'],
  },
  j_vampire: {
    addTimings: ['hand_scored', 'card_scored'],
  },
  j_trousers: {
    addTimings: ['hand_scored'],
  },
  j_wee: {
    addTimings: ['hand_scored', 'card_scored'],
  },
  j_caino: {
    addTimings: ['hand_scored', 'card_destroyed'],
  },
}

export function assertKnownJokerClassificationReferences(jokerIds: ReadonlySet<string>): void {
  for (const id of Object.keys(CLASSIFICATION_OVERRIDES)) {
    if (!jokerIds.has(id))
      throw new Error(`[data] classification override references unknown ID '${id}'`)
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

function sha256Text(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function createJokerFromSource(source: JokerSourceRecord, localImageSha1: string): Joker {
  const legendary = source.rarity === 'legendary'
  const classification = applyClassificationOverride(
    source.id,
    classifyEffects(source.wikiType, source.effectTextEn),
    classifyTimings(source.wikiActivation, source.effectTextEn),
    classifyDependencies(source.effectTextEn),
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
      effects: classification.effects,
      timings: classification.timings,
      dependencies: classification.dependencies,
    },
  }
}

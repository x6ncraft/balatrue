import { JOKER_EFFECTS, type JokerEffect, type JokerRarity } from '../data/types'
import {
  GAME_DEPENDENCY_FAMILIES,
  GAME_EFFECT_CATEGORIES,
  GAME_TIMING_FAMILIES,
  GAME_TIMINGS,
  gameDependencyDetailUnits,
  gameEffectCategory,
  gameTimingFamily,
  type GameDependency,
  type GameDependencyDetailGroupKey,
  type GameDependencyFamily,
  type GameEffectCategory,
  type GameEffectFamily,
  type GameEffectValue,
  type GameTiming,
  type GameTimingFamily,
} from '../game/clue-model'
import type { Locale } from '../i18n'

const rarityLabels: Record<JokerRarity, [string, string]> = {
  common: ['普通', 'Common'],
  uncommon: ['罕见', 'Uncommon'],
  rare: ['稀有', 'Rare'],
  legendary: ['传奇', 'Legendary'],
}

const rarityDescriptions: Record<JokerRarity, [string, string]> = {
  common: ['最低稀有度。', 'The lowest rarity tier.'],
  uncommon: ['高于普通、低于稀有。', 'Above Common and below Rare.'],
  rare: ['高于罕见、低于传奇。', 'Above Uncommon and below Legendary.'],
  legendary: ['最高稀有度，通过灵魂牌获得。', 'The highest tier, found through The Soul.'],
}

const effectLabels: Record<JokerEffect, [string, string]> = {
  chips: ['筹码', 'Chips'],
  mult: ['+倍率', '+Mult'],
  x_mult: ['×倍率', 'X Mult'],
  economy: ['经济', 'Money'],
  retrigger: ['再触发', 'Retrigger'],
  'generate:stone_card': ['生成石头牌', 'Create Stone card'],
  'generate:tarot': ['生成塔罗牌', 'Create Tarot'],
  'generate:playing_card_copy': ['复制扑克牌', 'Copy playing card'],
  'generate:spectral': ['生成幻灵牌', 'Create Spectral'],
  'generate:joker': ['生成小丑牌', 'Create Jokers'],
  'generate:tag': ['生成标签', 'Create Tag'],
  'generate:sealed_card': ['生成蜡封牌', 'Create cards with Seals'],
  'generate:joker_copy': ['复制小丑牌', 'Copy Joker'],
  'generate:consumable_copy': ['复制消耗牌', 'Copy consumable'],
  'modify:poker_hand_level': ['升级牌型', 'Upgrade poker hand'],
  'modify:destroy_playing_card': ['摧毁扑克牌', 'Destroy playing card'],
  'modify:gold_card': ['变为黄金牌', 'Turn cards Gold'],
  'resource:reroll': ['重掷次数', 'Rerolls'],
  'resource:hands': ['出牌次数', 'Hands'],
  'resource:discards': ['弃牌次数', 'Discards'],
  'resource:hand_size': ['手牌上限', 'Hand size'],
  'rules:poker_hand_size': ['牌型张数', 'Poker-hand size'],
  'rules:face_identity': ['人头牌判定', 'Face-card rules'],
  'rules:all_cards_score': ['全部参与计分', 'All cards score'],
  'rules:straight_gap': ['顺子间隔', 'Straight gaps'],
  'rules:boss_blind': ['Boss 盲注规则', 'Boss Blind rules'],
  'rules:survival': ['免于失败', 'Avoid losing'],
  'rules:suit_identity': ['花色判定', 'Suit rules'],
  'rules:duplicates': ['允许重复出现', 'Allow duplicates'],
  'rules:copy_ability': ['复制能力', 'Copy Joker abilities'],
  'rules:probability': ['概率规则', 'Chance / odds'],
}

const effectMechanismLabels: Record<JokerEffect, [string, string]> = {
  chips: ['筹码', 'Chips'],
  mult: ['+倍率', '+Mult'],
  x_mult: ['×倍率', 'X Mult'],
  economy: ['经济', 'Money'],
  retrigger: ['再触发', 'Retrigger'],
  'generate:stone_card': ['石头牌', 'Stone cards'],
  'generate:tarot': ['塔罗牌', 'Tarot cards'],
  'generate:playing_card_copy': ['复制扑克牌', 'Playing-card copies'],
  'generate:spectral': ['幻灵牌', 'Spectral cards'],
  'generate:joker': ['小丑牌', 'Jokers'],
  'generate:tag': ['标签', 'Tags'],
  'generate:sealed_card': ['蜡封牌', 'Cards with Seals'],
  'generate:joker_copy': ['复制小丑牌', 'Joker copies'],
  'generate:consumable_copy': ['复制消耗牌', 'Consumable copies'],
  'modify:poker_hand_level': ['牌型等级', 'Poker-hand levels'],
  'modify:destroy_playing_card': ['摧毁扑克牌', 'Destroy playing cards'],
  'modify:gold_card': ['黄金牌', 'Gold cards'],
  'resource:reroll': ['重掷次数', 'Rerolls'],
  'resource:hands': ['出牌次数', 'Hands'],
  'resource:discards': ['弃牌次数', 'Discards'],
  'resource:hand_size': ['手牌上限', 'Hand size'],
  'rules:poker_hand_size': ['顺子／同花张数', 'Straight / Flush size'],
  'rules:face_identity': ['人头牌判定', 'Face-card rules'],
  'rules:all_cards_score': ['所有出牌计分', 'All played cards score'],
  'rules:straight_gap': ['顺子间隔', 'Straight gaps'],
  'rules:boss_blind': ['Boss 盲注', 'Boss Blinds'],
  'rules:survival': ['免于失败', 'Avoid losing'],
  'rules:suit_identity': ['花色判定', 'Suit rules'],
  'rules:duplicates': ['允许重复出现', 'Allow duplicates'],
  'rules:copy_ability': ['复制能力', 'Copy Joker abilities'],
  'rules:probability': ['概率', 'Chance / odds'],
}

const effectFamilyDescriptions: Record<GameEffectFamily, [string, string]> = {
  chips: ['主要增加筹码。', 'Primarily adds Chips.'],
  mult: ['主要增加加法倍率。', 'Primarily adds additive Mult.'],
  x_mult: ['主要提供乘法倍率。', 'Primarily multiplies Mult.'],
  economy: ['主要产生或节省金钱。', 'Primarily earns or saves money.'],
  retrigger: ['让卡牌或其他效果再次触发。', 'Retriggers cards or other effects.'],
  generate: [
    '生成或复制扑克牌、小丑牌、消耗牌或标签。',
    'Creates or copies cards, Jokers, consumables, or Tags.',
  ],
  modify: ['改造、升级或摧毁已有的牌。', 'Modifies, upgrades, or destroys existing cards.'],
  resource: [
    '改变手牌上限、出牌、弃牌或重掷次数。',
    'Changes hand size, hands, discards, or rerolls.',
  ],
  rules: [
    '改变牌型、判定、概率或其他牌局规则。',
    'Changes hand evaluation, identity, probability, or other rules.',
  ],
}

const effectCategoryLabels: Record<GameEffectCategory, [string, string]> = {
  chips: ['筹码', 'Chips'],
  mult: ['+倍率', '+Mult'],
  x_mult: ['×倍率', 'X Mult'],
  economy: ['经济', 'Money'],
  generate: ['生成', 'Create / copy'],
  adjust: ['改牌／资源', 'Card / resource changes'],
  mechanic: ['规则／再触发', 'Rules / retriggers'],
}

const effectCategoryDescriptions: Record<GameEffectCategory, [string, string]> = {
  chips: effectFamilyDescriptions.chips,
  mult: effectFamilyDescriptions.mult,
  x_mult: effectFamilyDescriptions.x_mult,
  economy: effectFamilyDescriptions.economy,
  generate: effectFamilyDescriptions.generate,
  adjust: [
    '改造牌、升级牌型，或改变手牌上限、出牌、弃牌、重掷等牌局资源。',
    'Modifies cards or hand levels, or changes hands, discards, rerolls, and similar resources.',
  ],
  mechanic: [
    '再触发其他效果，或改变判定、复制、概率等规则。',
    'Retriggers effects or changes evaluation, copying, probability, and other rules.',
  ],
}

const timingLabels: Record<GameTiming, [string, string]> = {
  passive: ['持续生效', 'Always active'],
  hand_scored: ['整手计分', 'Hand scored'],
  card_scored: ['单牌计分', 'Card scored'],
  card_played: ['打出手牌', 'Hand played'],
  joker_triggered: ['其他小丑结算', 'Other Joker triggers'],
  card_held: ['留在手牌', 'Held in hand'],
  card_discarded: ['弃牌', 'Card discarded'],
  consumable_used: ['使用消耗牌', 'Consumable used'],
  card_added: ['加入牌组时', 'Card added to deck'],
  card_destroyed: ['卡牌摧毁时', 'Card destroyed'],
  blind_selected: ['选择盲注', 'Blind selected'],
  blind_skipped: ['跳过盲注', 'Blind skipped'],
  blind_defeated: ['击败盲注', 'Blind defeated'],
  blind_failed: ['未过盲注', 'Blind failed'],
  shop: ['商店中', 'In shop'],
  booster_opened: ['打开补充包', 'Booster Pack opened'],
  booster_skipped: ['跳过补充包', 'Booster Pack skipped'],
  shop_rerolled: ['商店重掷', 'Shop rerolled'],
  shop_ended: ['离开商店', 'Leaving shop'],
  sold: ['出售卡牌', 'Card sold'],
  round_start: ['回合开始', 'Start of round'],
  round_end: ['回合结束', 'End of round'],
}

const timingDescriptions: Record<GameTiming, [string, string]> = {
  passive: ['无需特定事件，持续影响牌局。', 'Continuously affects the run.'],
  hand_scored: ['整手牌进入小丑牌计分结算时。', 'When a played hand reaches Joker scoring.'],
  card_scored: ['单张已出牌参与计分时。', 'When an individual played card scores.'],
  card_played: ['一手牌打出后、计分前检查。', 'After a hand is played and before scoring.'],
  joker_triggered: ['其他小丑牌的能力结算时。', 'When another Joker ability resolves.'],
  card_held: ['扑克牌留在手牌中时。', 'While a playing card is held in hand.'],
  card_discarded: ['扑克牌被弃掉时。', 'When playing cards are discarded.'],
  consumable_used: ['使用塔罗牌、星球牌或幻灵牌时。', 'When a consumable is used.'],
  card_added: ['有扑克牌加入牌组时生效。', 'Applies when a playing card joins the deck.'],
  card_destroyed: ['扑克牌被摧毁时生效。', 'Applies when a playing card is destroyed.'],
  blind_selected: ['选择小盲注、大盲注或 Boss 盲注时。', 'When a Blind is selected.'],
  blind_skipped: ['跳过一个可跳过的盲注时。', 'When a Blind is skipped.'],
  blind_defeated: ['成功击败盲注时。', 'When a Blind is defeated.'],
  blind_failed: ['当前得分不足以通过盲注时。', 'When the current Blind would be failed.'],
  shop: ['停留在商店且符合对应物品规则时。', 'While in the shop.'],
  booster_opened: ['打开任意补充包时。', 'When any Booster Pack is opened.'],
  booster_skipped: ['放弃补充包内容时。', 'When a Booster Pack is skipped.'],
  shop_rerolled: ['在商店进行重掷时。', 'When the shop is rerolled.'],
  shop_ended: ['结束商店并准备进入下一盲注时。', 'When leaving the shop.'],
  sold: ['出售一张牌或这张小丑牌时。', 'When a card or this Joker is sold.'],
  round_start: ['新回合开始时生效。', 'Applies at the start of a round.'],
  round_end: ['回合结束或离开盲注时触发。', 'Triggers at the end of a round.'],
}

const timingFamilyLabels: Record<GameTimingFamily, [string, string]> = {
  always: ['持续生效', 'Always active'],
  hand_scored: ['整手结算', 'Hand scoring'],
  card_scored: ['逐牌计分', 'Card scoring'],
  hand_action: ['手牌动作', 'Play / hold / discard'],
  card_management: ['消耗牌／牌组变化', 'Consumables / deck changes'],
  blind: ['盲注阶段', 'Blind events'],
  shop: ['商店相关', 'Shop / packs'],
  round_boundary: ['回合交界', 'Round start / end'],
}

const timingFamilyDescriptions: Record<GameTimingFamily, [string, string]> = {
  always: ['持续影响牌局，不等待某个事件。', 'Continuously affects the run.'],
  hand_scored: [
    '整手进入小丑牌结算，或其他小丑能力结算时。',
    'When the played hand or another Joker resolves.',
  ],
  card_scored: ['单张已出牌参与计分时。', 'When an individual played card scores.'],
  hand_action: ['打出、留住或弃掉手牌时。', 'When cards are played, held in hand, or discarded.'],
  card_management: [
    '使用消耗牌，或扑克牌加入、离开牌组时。',
    'When a consumable is used or playing cards enter or leave the deck.',
  ],
  blind: [
    '选择、跳过、击败或未能通过盲注时。',
    'When a Blind is selected, skipped, defeated, or failed.',
  ],
  shop: [
    '在商店、开包、重掷、出售或离店时。',
    'In the shop, opening packs, rerolling, selling, or leaving.',
  ],
  round_boundary: ['回合开始或结束时。', 'At the start or end of a round.'],
}

const dependencyFamilyLabels: Record<GameDependencyFamily, [string, string]> = {
  cards: ['单牌／牌组', 'Card traits / deck'],
  hand: ['出牌／牌型', 'Played cards / poker hand'],
  discard: ['弃牌', 'Discards'],
  economy: ['金钱／商店', 'Money / shop'],
  other_cards: ['小丑／消耗牌', 'Jokers / consumables'],
  progress: ['盲注／回合', 'Blinds / rounds'],
  none: ['无需额外条件', 'No extra condition'],
}

const dependencyFamilyDescriptions: Record<GameDependencyFamily, [string, string]> = {
  cards: [
    '看单张牌或牌组本身：花色、点数、牌面状态、留手状态与牌组数量。',
    'Suit, rank, Enhancement, Seal, held-card state, or counts across the deck.',
  ],
  hand: [
    '看这一手怎么出：出牌张数与顺序、计分牌、出牌记录或组成的牌型。',
    'Which cards are played or scored, how many and in what order, and the poker hand they form.',
  ],
  discard: ['看弃牌次数、顺序或历史。', 'Looks at discard count, order, or history.'],
  economy: ['看金钱、出售价值或商店行为。', 'Looks at money, sell value, or shop actions.'],
  other_cards: [
    '看其他小丑牌、消耗牌或对应栏位。',
    'Looks at other Jokers, consumables, or their slots.',
  ],
  progress: ['看盲注、Boss 盲注或经过的回合。', 'Looks at Blinds or rounds played.'],
  none: [
    '除触发时机外，不要求额外的牌、资源或局面。',
    'Needs no extra card, resource, or state beyond its trigger.',
  ],
}

const valueLabels: Record<string, [string, string]> = {
  diamonds: ['方片', 'Diamonds'],
  hearts: ['红桃', 'Hearts'],
  spades: ['黑桃', 'Spades'],
  clubs: ['梅花', 'Clubs'],
  face_cards: ['人头牌', 'Face cards'],
  face_card: ['人头牌', 'Face cards'],
  ace: ['A', 'Ace'],
  king: ['K', 'King'],
  queen: ['Q', 'Queen'],
  jack: ['J', 'Jack'],
  even: ['偶数点数', 'Even ranks'],
  odd: ['奇数点数', 'Odd ranks'],
  pair: ['对子', 'Pair'],
  two_pair: ['两对', 'Two Pair'],
  three_of_a_kind: ['三条', 'Three of a Kind'],
  four_of_a_kind: ['四条', 'Four of a Kind'],
  straight: ['顺子', 'Straight'],
  flush: ['同花', 'Flush'],
  straight_flush: ['同花顺', 'Straight Flush'],
  full_house: ['葫芦', 'Full House'],
  high_card: ['高牌', 'High Card'],
  enhanced: ['增强牌', 'Enhanced cards'],
  stone: ['石头牌', 'Stone cards'],
  steel: ['钢铁牌', 'Steel cards'],
  glass: ['玻璃牌', 'Glass cards'],
  gold: ['黄金牌', 'Gold cards'],
  lucky: ['幸运牌', 'Lucky cards'],
  seal: ['蜡封', 'Seals'],
  tarot: ['塔罗牌', 'Tarot cards'],
  planet: ['星球牌', 'Planet cards'],
  spectral: ['幻灵牌', 'Spectral cards'],
  boss: ['Boss 盲注', 'Boss Blind'],
  any: ['任意', 'Any'],
  face: ['人头牌', 'Face cards'],
  enhancement: ['增强牌', 'Enhanced cards'],
  edition: ['版本效果', 'Editions'],
  hand_size: ['手牌数量', 'Hand size'],
  hands_per_round: ['每回合出牌', 'Hands per round'],
  card_count: ['单次牌数', 'Card count'],
  played_hands: ['已出手牌', 'Hands played'],
  final_hand: ['回合最后一次出牌', 'Final hand of round'],
  first_hand: ['回合第一次出牌', 'First hand of round'],
  leftmost: ['最左侧', 'Leftmost'],
  right: ['右侧', 'To the right'],
  available: ['有空位', 'Open slot'],
  available_slot: ['空消耗牌栏', 'Open consumable slot'],
  below_starting_size: ['少于初始牌数', 'Below starting deck size'],
  boss_ability_triggered: ['Boss 能力被触发', 'Boss ability triggered'],
  boss_defeated_count: ['已击败 Boss 数', 'Bosses defeated'],
  card_count_1: ['单张牌', 'Exactly 1 card'],
  card_count_4: ['正好 4 张牌', 'Exactly 4 cards'],
  card_count_gte_3: ['至少 3 张牌', 'At least 3 cards'],
  card_count_lte_3: ['不超过 3 张牌', 'At most 3 cards'],
  cash: ['现有金钱', 'Current money'],
  cash_for_interest: ['可计息金钱', 'Money earning interest'],
  cash_lte_4: ['$4 或更少', '$4 or less'],
  consecutive_plays: ['连续出牌记录', 'Consecutive plays'],
  consecutive_without_face: ['连续未出人头牌', 'Consecutive hands without face cards'],
  current_boss: ['当前 Boss 盲注', 'Current Boss Blind'],
  elapsed: ['经过的回合', 'Rounds elapsed'],
  elapsed_2: ['经过 2 个回合', 'After 2 rounds'],
  empty_count: ['空小丑栏数量', 'Empty Joker slots'],
  enhancement_count_gte_16: ['至少 16 张增强牌', 'At least 16 enhanced cards'],
  every_6_hands: ['每 6 手', 'Every 6 hands'],
  first: ['每回合第一次', 'First each round'],
  first_scoring: ['首张计分牌', 'First scoring card'],
  full_count: ['全牌组数量', 'Full-deck count'],
  held_ability: ['手牌中的能力', 'Held-card abilities'],
  held_clubs_or_spades: ['手牌全为梅花或黑桃', 'Only Clubs or Spades held'],
  held_face: ['手牌中的人头牌', 'Face cards held'],
  held_king: ['手牌中的 K', 'Kings held'],
  held_lowest_rank: ['手牌最低点数', 'Lowest held rank'],
  held_queen: ['手牌中的 Q', 'Queens held'],
  history_count_23: ['累计弃掉 23 张牌', '23 cards discarded'],
  jack_count_this_round: ['本回合弃掉的 J', 'Jacks discarded this round'],
  lucky_triggered: ['幸运牌成功触发', 'Lucky card triggered'],
  matching_count: ['匹配花色的弃牌数', 'Matching-suit discards'],
  most_played: ['最常用牌型', 'Most-played hand'],
  next_10_hands: ['接下来 10 手', 'Next 10 hands'],
  none_remaining: ['没有剩余弃牌', 'No discards remaining'],
  none_used: ['本回合未用弃牌', 'No discards used this round'],
  other: ['另一种花色', 'Another suit'],
  other_random: ['另一张随机小丑', 'Another random Joker'],
  owned: ['已拥有的牌', 'Owned cards'],
  owned_count: ['已拥有数量', 'Owned count'],
  planet_or_celestial_shop_item: ['星球牌或天体包', 'Planet cards or Celestial Packs'],
  planet_used_count: ['已使用的星球牌数', 'Planet cards used'],
  played_before_this_round: ['本回合已出过的牌型', 'Hand already played this round'],
  played_count: ['经过的回合数', 'Rounds played'],
  played_hand_count: ['已出手牌数', 'Hands played'],
  remaining_count: ['剩余弃牌数', 'Discards remaining'],
  reroll_count: ['累计商店重掷', 'Shop rerolls'],
  rotating_target: ['当回合指定目标', 'Current rotating target'],
  score_gte_25_percent: ['至少达到目标分数 25%', 'At least 25% of target score'],
  sell_value: ['出售价值', 'Sell value'],
  skipped_count: ['已跳过盲注数', 'Blinds skipped'],
  small_or_big: ['小盲注或大盲注', 'Small or Big Blind'],
  sold_card_count: ['本轮售牌数', 'Cards sold this round'],
  tarot_used_count: ['已使用的塔罗牌数', 'Tarot cards used'],
  uncommon: ['罕见小丑', 'Uncommon Jokers'],
  unique_planets_used: ['已使用的不同星球牌', 'Unique Planet cards used'],
  used_count: ['累计使用次数', 'Times used'],
}

const sourceOnlyDependencyLabels: Record<string, [string, string]> = {
  playing_card: ['任意牌', 'Any card'],
  deck: ['牌组', 'Deck'],
  discard: ['弃牌', 'Discards'],
  money: ['金钱', 'Money'],
  joker: ['其他小丑', 'Other Jokers'],
  joker_slot: ['小丑栏位', 'Joker slots'],
  shop: ['商店', 'Shop'],
  round: ['回合', 'Rounds'],
  blind: ['盲注', 'Blinds'],
}

const dependencySourceLabels: Record<string, [string, string]> = {
  suit: ['花色', 'Suits'],
  rank: ['点数', 'Ranks'],
  card_modifier: ['牌面状态', 'Card states'],
  playing_card: ['单张牌', 'Individual cards'],
  deck: ['牌组', 'Deck'],
  poker_hand: ['牌型', 'Poker hands'],
  hand: ['出牌情况', 'Played hands'],
  discard: ['弃牌', 'Discards'],
  money: ['金钱', 'Money'],
  shop: ['商店', 'Shop'],
  joker: ['其他小丑', 'Other Jokers'],
  joker_slot: ['小丑栏位', 'Joker slots'],
  consumable: ['消耗牌', 'Consumables'],
  round: ['回合', 'Rounds'],
  blind: ['盲注', 'Blinds'],
  none: ['无需额外条件', 'No extra condition'],
}

const contextualAnyLabels: Record<string, [string, string]> = {
  suit: ['任意花色', 'Any suit'],
  rank: ['任意点数', 'Any rank'],
  poker_hand: ['任意牌型', 'Any poker hand'],
  consumable: ['任意消耗牌', 'Any consumable'],
}

const contextualDetailLabels: Record<string, [string, string]> = {
  'suit:rotating_target': ['当回合指定花色', 'Current target suit'],
  'rank:rotating_target': ['当回合指定点数', 'Current target rank'],
  'poker_hand:rotating_target': ['当回合指定牌型', 'Current target poker hand'],
  'deck:remaining_count': ['牌组剩余牌数', 'Cards remaining in deck'],
  'deck:full_count': ['全牌组中的数量', 'Count across the full deck'],
  'discard:remaining_count': ['剩余弃牌数', 'Discards remaining'],
  'discard:used_count': ['累计弃牌数', 'Cards discarded'],
  'discard:first': ['每回合第一次弃牌', 'First discard each round'],
  'discard:card_count_1': ['一次弃 1 张牌', 'Exactly 1 card discarded'],
  'discard:card_count_gte_3': ['一次弃至少 3 张牌', 'At least 3 cards discarded'],
  'joker:owned': ['已有小丑牌', 'Owned Jokers'],
  'consumable:owned': ['已有消耗牌', 'Owned consumables'],
  'joker_slot:available': ['空小丑栏', 'Open Joker slot'],
  'consumable:available_slot': ['空消耗牌栏', 'Open consumable slot'],
}

const dependencyDetailGroupLabels: Record<GameDependencyDetailGroupKey, readonly [string, string]> =
  {
    steel_full_deck: ['全牌组中的钢铁牌数量', 'Steel Cards in your full deck'],
    stone_full_deck: ['全牌组中的石头牌数量', 'Stone Cards in your full deck'],
    nine_full_deck: ['全牌组中的 9 数量', '9s in your full deck'],
    first_single_hand: ['首手单张', 'First hand is exactly 1 card'],
    first_single_discard: ['首次弃 1 张牌', 'First discard is exactly 1 card'],
    all_suits: ['四种花色', 'All four suits'],
    all_consumables: ['三类消耗牌', 'All 3 consumables'],
  }

function localized(pair: readonly [string, string], locale: Locale): string {
  return locale === 'zh-CN' ? pair[0] : pair[1]
}

function humanize(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function rarityLabel(value: JokerRarity, locale: Locale): string {
  return localized(rarityLabels[value], locale)
}

export function rarityDescription(value: JokerRarity, locale: Locale): string {
  return localized(rarityDescriptions[value], locale)
}

export function effectLabel(value: string, locale: Locale): string {
  const pair = effectLabels[value as JokerEffect]
  return pair ? localized(pair, locale) : humanize(value)
}

export function effectMechanismLabel(value: JokerEffect, locale: Locale): string {
  return localized(effectMechanismLabels[value], locale)
}

export function hasEffectLabel(value: string): boolean {
  return value in effectLabels
}

export function effectDescription(value: JokerEffect, locale: Locale): string {
  const family = value.includes(':') ? value.slice(0, value.indexOf(':')) : value
  return localized(effectFamilyDescriptions[family as GameEffectFamily], locale)
}

export function effectCategoryLabel(value: GameEffectCategory, locale: Locale): string {
  return localized(effectCategoryLabels[value], locale)
}

export function effectCategoryDescription(value: GameEffectCategory, locale: Locale): string {
  return localized(effectCategoryDescriptions[value], locale)
}

export function effectValueLabel(value: GameEffectValue, locale: Locale): string {
  return effectCategoryLabel(value, locale)
}

export function effectValuesLabel(values: readonly GameEffectValue[], locale: Locale): string {
  return listLabel(values, effectValueLabel, locale)
}

export function effectMechanismsLabel(values: readonly JokerEffect[], locale: Locale): string {
  return GAME_EFFECT_CATEGORIES.flatMap((category) => {
    const matches = values.filter((effect) => gameEffectCategory(effect) === category)
    if (matches.length === 0) return []

    const categoryLabel = effectCategoryLabel(category, locale)
    const availableDetails = JOKER_EFFECTS.filter(
      (effect) => gameEffectCategory(effect) === category,
    )
    if (availableDetails.length === 1) return [categoryLabel]

    const details = [...new Set(matches.map((effect) => effectMechanismLabel(effect, locale)))]
    const detailList = details.join(locale === 'zh-CN' ? '、' : ', ')
    return [
      locale === 'zh-CN' ? `${categoryLabel}：${detailList}` : `${categoryLabel}: ${detailList}`,
    ]
  }).join(locale === 'zh-CN' ? '；' : '; ')
}

/** Exact guessed-side mechanisms shown beneath the board's canonical effect category. */
export function effectMechanismDetailsLabel(
  values: readonly JokerEffect[],
  locale: Locale,
): string {
  const details = GAME_EFFECT_CATEGORIES.flatMap((category) =>
    values
      .filter((effect) => gameEffectCategory(effect) === category)
      .map((effect) => effectMechanismLabel(effect, locale))
      .filter((detail) => detail !== effectCategoryLabel(category, locale)),
  )
  return joinedDetails(details, locale)
}

function uniqueLabels(values: readonly string[]): string[] {
  return [...new Set(values)]
}

function joinedDetails(values: readonly string[], locale: Locale): string {
  return uniqueLabels(values).join(locale === 'zh-CN' ? '、' : ', ')
}

export function timingLabel(value: string, locale: Locale): string {
  const pair = timingLabels[value as GameTiming]
  return pair ? localized(pair, locale) : humanize(value)
}

export function hasTimingLabel(value: string): boolean {
  return value in timingLabels
}

export function timingDescription(value: GameTiming, locale: Locale): string {
  return localized(timingDescriptions[value], locale)
}

export function timingFamilyLabel(value: GameTimingFamily, locale: Locale): string {
  return localized(timingFamilyLabels[value], locale)
}

export function timingFamilyDescription(value: GameTimingFamily, locale: Locale): string {
  return localized(timingFamilyDescriptions[value], locale)
}

export function timingFamiliesLabel(values: readonly GameTimingFamily[], locale: Locale): string {
  return listLabel(values, timingFamilyLabel, locale)
}

export function timingDetailsLabel(values: readonly GameTiming[], locale: Locale): string {
  return GAME_TIMING_FAMILIES.flatMap((family) => {
    const matches = values.filter((timing) => gameTimingFamily(timing) === family)
    if (matches.length === 0) return []

    const familyLabel = timingFamilyLabel(family, locale)
    const availableDetails = GAME_TIMINGS.filter((timing) => gameTimingFamily(timing) === family)
    if (availableDetails.length === 1) return [familyLabel]

    const details = matches.map((timing) => timingLabel(timing, locale))
    const detailList = details.join(locale === 'zh-CN' ? '、' : ', ')
    return [locale === 'zh-CN' ? `${familyLabel}：${detailList}` : `${familyLabel}: ${detailList}`]
  }).join(locale === 'zh-CN' ? '；' : '; ')
}

/** Exact guessed-side trigger events shown beneath the board's canonical trigger category. */
export function timingDetailValuesLabel(values: readonly GameTiming[], locale: Locale): string {
  const details = GAME_TIMING_FAMILIES.flatMap((family) =>
    values
      .filter((timing) => gameTimingFamily(timing) === family)
      .map((timing) => timingLabel(timing, locale))
      .filter((detail) => detail !== timingFamilyLabel(family, locale)),
  )
  return joinedDetails(details, locale)
}

export function dependencyFamilyLabel(family: GameDependencyFamily, locale: Locale): string {
  return localized(dependencyFamilyLabels[family], locale)
}

export function dependencyFamilyDescription(family: GameDependencyFamily, locale: Locale): string {
  return localized(dependencyFamilyDescriptions[family], locale)
}

export function dependencyValueLabel(value: string, locale: Locale): string {
  const normalizedValue = value.toLowerCase().replaceAll(' ', '_')
  const pair = valueLabels[normalizedValue]
  return pair ? localized(pair, locale) : humanize(value)
}

export function dependencySourceLabel(
  value: string,
  locale: Locale,
  category?: GameDependencyFamily,
): string {
  if (value === 'playing_card' && category === 'cards') {
    return locale === 'zh-CN' ? '留在手牌' : 'Held cards'
  }
  if (value === 'playing_card' && category === 'hand') {
    return locale === 'zh-CN' ? '计分牌' : 'Scoring cards'
  }
  const pair = dependencySourceLabels[value]
  return pair ? localized(pair, locale) : humanize(value)
}

export function hasDependencyValueLabel(value: string): boolean {
  const normalizedValue = value.toLowerCase().replaceAll(' ', '_')
  return /^\d+$/.test(normalizedValue) || normalizedValue in valueLabels
}

export function gameDependencyDetailLabel(value: string, locale: Locale): string {
  const separatorIndex = value.indexOf(':')
  const sourceFamily = separatorIndex === -1 ? value : value.slice(0, separatorIndex)
  const sourceValue = separatorIndex === -1 ? '' : value.slice(separatorIndex + 1)

  if (!sourceValue) {
    const pair = sourceOnlyDependencyLabels[sourceFamily]
    return pair ? localized(pair, locale) : humanize(sourceFamily)
  }
  const contextualPair = contextualDetailLabels[`${sourceFamily}:${sourceValue}`]
  if (contextualPair) return localized(contextualPair, locale)
  if (sourceValue === 'any' && contextualAnyLabels[sourceFamily]) {
    return localized(contextualAnyLabels[sourceFamily], locale)
  }
  if (sourceFamily === 'joker' && sourceValue === 'leftmost') {
    return locale === 'zh-CN' ? '最左侧小丑' : 'Leftmost Joker'
  }
  if (sourceFamily === 'joker' && sourceValue === 'right') {
    return locale === 'zh-CN' ? '右侧小丑' : 'Joker to the right'
  }
  return dependencyValueLabel(sourceValue, locale)
}

interface DependencyDetailUnit {
  readonly values: readonly string[]
  readonly label: string
  readonly order: number
}

function dependencyDetailUnits(
  values: readonly string[],
  locale: Locale,
  collapseConsumables = false,
): DependencyDetailUnit[] {
  return gameDependencyDetailUnits(values, collapseConsumables).map((unit) => ({
    values: unit.values,
    label: unit.group
      ? localized(dependencyDetailGroupLabels[unit.group], locale)
      : gameDependencyDetailLabel(unit.values[0] ?? '', locale),
    order: unit.order,
  }))
}

export function dependencyDetailLabels(
  values: readonly string[],
  locale: Locale,
  collapseConsumables = false,
): string[] {
  return dependencyDetailUnits(values, locale, collapseConsumables).map((unit) => unit.label)
}

/** Exact guessed-side conditions shown beneath the board's canonical condition category. */
export function dependencyDetailsLabel(values: readonly GameDependency[], locale: Locale): string {
  const details = GAME_DEPENDENCY_FAMILIES.flatMap((family) =>
    dependencyDetailLabels(
      values.flatMap((dependency) =>
        dependency.family === family && dependency.value ? [dependency.value] : [],
      ),
      locale,
      true,
    ),
  )
  return joinedDetails(details, locale)
}

export function dependencyLabel(value: GameDependency, locale: Locale): string {
  const family = dependencyFamilyLabel(value.family, locale)
  if (!value.value || value.family === 'none') return family

  const detail = gameDependencyDetailLabel(value.value, locale)
  return locale === 'zh-CN' ? `${family}：${detail}` : `${family}: ${detail}`
}

export function dependenciesLabel(values: readonly GameDependency[], locale: Locale): string {
  return GAME_DEPENDENCY_FAMILIES.flatMap((family) => {
    const matches = values.filter((value) => value.family === family)
    if (matches.length === 0) return []
    const familyLabel = dependencyFamilyLabel(family, locale)
    if (family === 'none') return [familyLabel]

    const details = dependencyDetailLabels(
      matches.flatMap((value) => (value.value ? [value.value] : [])),
      locale,
    )
    if (details.length === 0) return [familyLabel]
    const detailList = details.join(locale === 'zh-CN' ? '、' : ', ')
    return [locale === 'zh-CN' ? `${familyLabel}：${detailList}` : `${familyLabel}: ${detailList}`]
  }).join(locale === 'zh-CN' ? '；' : '; ')
}

export function compactDependenciesLabel(
  values: readonly GameDependency[],
  locale: Locale,
): string {
  const selected = new Set(values.map((value) => value.family))
  return GAME_DEPENDENCY_FAMILIES.filter((family) => selected.has(family))
    .map((family) => dependencyFamilyLabel(family, locale))
    .join(' · ')
}

export function listLabel<TValue extends string>(
  values: readonly TValue[],
  formatter: (value: TValue, locale: Locale) => string,
  locale: Locale,
): string {
  return values.map((value) => formatter(value, locale)).join(locale === 'zh-CN' ? '、' : ', ')
}

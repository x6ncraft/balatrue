import type { JokerDependency, JokerEffect, JokerRarity, JokerTiming } from '../data/types'
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
  x_mult: ['×倍率', '×Mult'],
  economy: ['经济', 'Economy'],
  retrigger: ['再触发', 'Retrigger'],
  mechanism: ['机制', 'Mechanic'],
}

const effectDescriptions: Record<JokerEffect, [string, string]> = {
  chips: ['主要增加筹码。', 'Primarily adds Chips.'],
  mult: ['主要增加加法倍率。', 'Primarily adds additive Mult.'],
  x_mult: ['主要提供乘法倍率。', 'Primarily multiplies Mult.'],
  economy: ['主要产生或节省金钱。', 'Primarily earns or saves money.'],
  retrigger: ['让卡牌或其他效果再次触发。', 'Retriggers cards or other effects.'],
  mechanism: ['改变规则、资源、牌组或栏位。', 'Changes rules, resources, the deck, or slots.'],
}

const timingLabels: Record<JokerTiming, [string, string]> = {
  passive: ['持续', 'Passive'],
  hand_scored: ['手牌计分', 'Hand scored'],
  card_scored: ['卡牌计分', 'Card scored'],
  card_played: ['出牌时', 'Card played'],
  card_held: ['留在手牌', 'Held in hand'],
  card_discarded: ['弃牌时', 'On discard'],
  blind_selected: ['选盲注', 'Blind selected'],
  shop: ['商店', 'Shop'],
  round_end: ['回合结束', 'End of round'],
  sold: ['出售时', 'When sold'],
  joker_triggered: ['小丑触发', 'Joker triggered'],
  mixed: ['多个时点', 'Multiple'],
}

const timingDescriptions: Record<JokerTiming, [string, string]> = {
  passive: ['无需特定动作，持续影响牌局。', 'Applies continuously without a specific action.'],
  hand_scored: ['一手牌完成计分时触发。', 'Triggers when a played hand is scored.'],
  card_scored: ['某张扑克牌参与计分时触发。', 'Triggers when an individual card scores.'],
  card_played: ['打出扑克牌或提交手牌时触发。', 'Triggers when cards are played.'],
  card_held: ['扑克牌留在手牌中时生效。', 'Applies to cards held in hand.'],
  card_discarded: ['弃掉扑克牌时触发。', 'Triggers when cards are discarded.'],
  blind_selected: ['选择盲注后触发。', 'Triggers when a Blind is selected.'],
  shop: ['进入商店、购买或使用商店内容时触发。', 'Triggers from shop actions.'],
  round_end: ['回合结束或离开盲注时触发。', 'Triggers at the end of a round.'],
  sold: ['出售小丑牌或其他物品时触发。', 'Triggers when an item is sold.'],
  joker_triggered: ['其他小丑牌生效时跟随触发。', 'Triggers from another Joker.'],
  mixed: ['包含两个或更多不同生效时点。', 'Uses two or more different trigger timings.'],
}

const dependencyFamilyLabels: Record<JokerDependency['family'], [string, string]> = {
  suit: ['花色', 'Suit'],
  rank: ['点数', 'Rank'],
  poker_hand: ['牌型', 'Poker hand'],
  playing_card: ['扑克牌', 'Playing card'],
  card_modifier: ['卡牌增强', 'Card modifier'],
  money: ['金钱', 'Money'],
  joker: ['其他小丑', 'Jokers'],
  consumable: ['消耗牌', 'Consumables'],
  discard: ['弃牌', 'Discards'],
  hand: ['出牌次数', 'Hands'],
  round: ['回合', 'Rounds'],
  blind: ['盲注', 'Blinds'],
  shop: ['商店', 'Shop'],
  deck: ['牌组', 'Deck'],
  joker_slot: ['小丑栏位', 'Joker slots'],
  none: ['无特定依赖', 'No specific dependency'],
}

const dependencyFamilyDescriptions: Record<JokerDependency['family'], [string, string]> = {
  suit: ['依赖方片、红桃、黑桃或梅花。', 'Depends on one or more card suits.'],
  rank: ['依赖特定点数或人头牌。', 'Depends on card ranks or face cards.'],
  poker_hand: ['依赖对子、顺子、同花等牌型。', 'Depends on a poker hand type.'],
  playing_card: ['依赖打出、留手或牌组中的扑克牌。', 'Depends on playing cards.'],
  card_modifier: [
    '依赖增强、蜡封或版本效果。',
    'Depends on card enhancements, seals, or editions.',
  ],
  money: ['依赖当前金钱、收入或出售价值。', 'Depends on money, income, or sell value.'],
  joker: ['依赖其他小丑牌或其状态。', 'Depends on other Jokers.'],
  consumable: ['依赖塔罗、星球或幻灵牌。', 'Depends on Tarot, Planet, or Spectral cards.'],
  discard: ['依赖弃牌次数或弃牌动作。', 'Depends on discards.'],
  hand: ['依赖手牌数量、出牌次数或出牌张数。', 'Depends on hand size, hands, or cards played.'],
  round: ['依赖经过的回合或连续回合。', 'Depends on rounds played.'],
  blind: ['依赖盲注、Boss 盲注或其状态。', 'Depends on Blinds or Boss Blinds.'],
  shop: ['依赖商店、补充包或重掷。', 'Depends on shops, packs, or rerolls.'],
  deck: ['依赖牌组大小或牌组构成。', 'Depends on deck size or composition.'],
  joker_slot: ['依赖空余或已占用的小丑栏位。', 'Depends on available Joker slots.'],
  none: ['不要求某一类牌或资源。', 'Has no specific card or resource condition.'],
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

export function effectDescription(value: JokerEffect, locale: Locale): string {
  return localized(effectDescriptions[value], locale)
}

export function timingLabel(value: string, locale: Locale): string {
  const pair = timingLabels[value as JokerTiming]
  return pair ? localized(pair, locale) : humanize(value)
}

export function timingDescription(value: JokerTiming, locale: Locale): string {
  return localized(timingDescriptions[value], locale)
}

export function dependencyFamilyLabel(family: JokerDependency['family'], locale: Locale): string {
  return localized(dependencyFamilyLabels[family], locale)
}

export function dependencyFamilyDescription(
  family: JokerDependency['family'],
  locale: Locale,
): string {
  return localized(dependencyFamilyDescriptions[family], locale)
}

export function dependencyValueLabel(value: string, locale: Locale): string {
  const normalizedValue = value.toLowerCase().replaceAll(' ', '_')
  const pair = valueLabels[normalizedValue]
  return pair ? localized(pair, locale) : humanize(value)
}

export function hasDependencyValueLabel(value: string): boolean {
  const normalizedValue = value.toLowerCase().replaceAll(' ', '_')
  return /^\d+$/.test(normalizedValue) || normalizedValue in valueLabels
}

export function dependencyLabel(
  value: Pick<JokerDependency, 'value'> & { family: string },
  locale: Locale,
): string {
  const familyPair = dependencyFamilyLabels[value.family as JokerDependency['family']]
  const family = familyPair ? localized(familyPair, locale) : humanize(value.family)
  if (!value.value || value.family === 'none') return family

  const detail = dependencyValueLabel(value.value, locale)
  return locale === 'zh-CN' ? `${family}·${detail}` : `${family}: ${detail}`
}

export function listLabel(
  values: readonly string[],
  formatter: (value: string, locale: Locale) => string,
  locale: Locale,
): string {
  return values.map((value) => formatter(value, locale)).join(locale === 'zh-CN' ? '、' : ', ')
}

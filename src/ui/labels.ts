import type { JokerDependency, JokerEffect, JokerRarity, JokerTiming } from '../data/types'
import type { Locale } from '../i18n'

const rarityLabels: Record<JokerRarity, [string, string]> = {
  common: ['普通', 'Common'],
  uncommon: ['罕见', 'Uncommon'],
  rare: ['稀有', 'Rare'],
  legendary: ['传奇', 'Legendary'],
}

const effectLabels: Record<JokerEffect, [string, string]> = {
  chips: ['筹码', 'Chips'],
  mult: ['+倍率', '+Mult'],
  x_mult: ['×倍率', '×Mult'],
  economy: ['经济', 'Economy'],
  retrigger: ['再触发', 'Retrigger'],
  mechanism: ['机制', 'Mechanic'],
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
  none: ['无特定条件', 'No condition'],
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
  card_count: ['出牌张数', 'Cards played'],
  played_hands: ['已出手牌', 'Hands played'],
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

export function effectLabel(value: string, locale: Locale): string {
  const pair = effectLabels[value as JokerEffect]
  return pair ? localized(pair, locale) : humanize(value)
}

export function timingLabel(value: string, locale: Locale): string {
  const pair = timingLabels[value as JokerTiming]
  return pair ? localized(pair, locale) : humanize(value)
}

export function dependencyLabel(
  value: Pick<JokerDependency, 'value'> & { family: string },
  locale: Locale,
): string {
  const familyPair = dependencyFamilyLabels[value.family as JokerDependency['family']]
  const family = familyPair ? localized(familyPair, locale) : humanize(value.family)
  if (!value.value || value.family === 'none') return family

  const normalizedValue = value.value.toLowerCase().replaceAll(' ', '_')
  const pair = valueLabels[normalizedValue]
  const detail = pair ? localized(pair, locale) : humanize(value.value)
  return locale === 'zh-CN' ? `${family}·${detail}` : `${family}: ${detail}`
}

export function listLabel(
  values: readonly string[],
  formatter: (value: string, locale: Locale) => string,
  locale: Locale,
): string {
  return values.map((value) => formatter(value, locale)).join(locale === 'zh-CN' ? '、' : ', ')
}

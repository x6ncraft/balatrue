import type { JokerEffect, JokerRarity } from '../data/types'
import {
  GAME_DEPENDENCY_FAMILIES,
  type GameDependency,
  type GameDependencyFamily,
  type GameTiming,
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

const timingLabels: Record<GameTiming, [string, string]> = {
  always: ['常驻', 'Always on'],
  play: ['出牌时', 'When playing'],
  held: ['留在手牌', 'Held in hand'],
  discard: ['弃牌时', 'On discard'],
  consumable: ['使用消耗牌时', 'Using consumables'],
  card_added: ['加入牌组时', 'Adding cards'],
  card_destroyed: ['卡牌摧毁时', 'Destroying cards'],
  blind: ['盲注阶段', 'Blind phase'],
  shop: ['商店/出售', 'Shop & selling'],
  round_start: ['回合开始', 'Start of round'],
  round_end: ['回合结束', 'End of round'],
}

const timingDescriptions: Record<GameTiming, [string, string]> = {
  always: ['无需特定动作，一直影响牌局。', 'Continuously affects the run.'],
  play: ['打出一手牌或进行计分时生效。', 'Applies when a hand is played or scored.'],
  held: ['扑克牌留在手牌中时生效。', 'Applies to cards held in hand.'],
  discard: ['弃掉扑克牌时生效。', 'Applies when cards are discarded.'],
  consumable: ['使用塔罗牌、星球牌或幻灵牌时生效。', 'Applies when a consumable is used.'],
  card_added: ['有扑克牌加入牌组时生效。', 'Applies when a playing card joins the deck.'],
  card_destroyed: ['扑克牌被摧毁时生效。', 'Applies when a playing card is destroyed.'],
  blind: [
    '选择、跳过或击败盲注时生效。',
    'Applies when a Blind is selected, skipped, or defeated.',
  ],
  shop: ['在商店、开包、重掷或出售时生效。', 'Applies in the shop or when selling.'],
  round_start: ['新回合开始时生效。', 'Applies at the start of a round.'],
  round_end: ['回合结束或离开盲注时触发。', 'Triggers at the end of a round.'],
}

const dependencyFamilyLabels: Record<GameDependencyFamily, [string, string]> = {
  cards: ['扑克牌/牌组', 'Cards & deck'],
  hand_type: ['牌型', 'Poker hand'],
  actions: ['出牌/弃牌', 'Play & discard'],
  economy: ['金钱/商店', 'Money & shop'],
  jokers: ['小丑/栏位', 'Jokers & slots'],
  consumables: ['消耗牌', 'Consumables'],
  progress: ['盲注/回合', 'Blinds & rounds'],
  none: ['无特定条件', 'No specific condition'],
}

const dependencyFamilyDescriptions: Record<GameDependencyFamily, [string, string]> = {
  cards: [
    '看扑克牌的花色、点数、增强效果或牌组构成。',
    'Looks at card suits, ranks, modifiers, or deck composition.',
  ],
  hand_type: ['看对子、顺子、同花等牌型。', 'Looks for a poker hand such as a Pair or Flush.'],
  actions: [
    '看出牌张数、手牌数量、出牌次数或弃牌。',
    'Looks at cards played, hand size, hands, or discards.',
  ],
  economy: ['看金钱、出售价值、商店、开包或重掷。', 'Looks at money or shop actions.'],
  jokers: ['看其他小丑牌、相对位置或栏位。', 'Looks at other Jokers or Joker slots.'],
  consumables: ['看塔罗牌、星球牌或幻灵牌。', 'Looks at Tarot, Planet, or Spectral cards.'],
  progress: ['看盲注、Boss 盲注或经过的回合。', 'Looks at Blinds or rounds played.'],
  none: ['无需特定牌、资源或操作。', 'Needs no specific card, resource, or action.'],
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

const contextualAnyLabels: Record<string, [string, string]> = {
  suit: ['任意花色', 'Any suit'],
  rank: ['任意点数', 'Any rank'],
  poker_hand: ['任意牌型', 'Any poker hand'],
  consumable: ['任意消耗牌', 'Any consumable'],
}

const allSuitsLabel: readonly [string, string] = ['四种花色', 'All four suits']
const allConsumablesLabel: readonly [string, string] = ['三类消耗牌', 'All 3 consumables']

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
  const pair = timingLabels[value as GameTiming]
  return pair ? localized(pair, locale) : humanize(value)
}

export function timingDescription(value: GameTiming, locale: Locale): string {
  return localized(timingDescriptions[value], locale)
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

function compactDependencyValues(
  values: readonly string[],
  locale: Locale,
  collapseConsumables = false,
): string[] {
  const uniqueValues = [...new Set(values)]
  const suitValues = ['suit:clubs', 'suit:diamonds', 'suit:hearts', 'suit:spades']
  const consumableValues = ['consumable:planet', 'consumable:spectral', 'consumable:tarot']
  if (collapseConsumables && consumableValues.every((value) => uniqueValues.includes(value))) {
    return [
      localized(allConsumablesLabel, locale),
      ...uniqueValues
        .filter((value) => !consumableValues.includes(value))
        .map((value) => gameDependencyDetailLabel(value, locale)),
    ]
  }
  if (suitValues.every((value) => uniqueValues.includes(value))) {
    return [
      localized(allSuitsLabel, locale),
      ...uniqueValues
        .filter((value) => !suitValues.includes(value))
        .map((value) => gameDependencyDetailLabel(value, locale)),
    ]
  }
  return uniqueValues.map((value) => gameDependencyDetailLabel(value, locale))
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

    const details = compactDependencyValues(
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
  return GAME_DEPENDENCY_FAMILIES.flatMap((family) => {
    const matches = values.filter((value) => value.family === family)
    if (matches.length === 0) return []
    if (family === 'none') return [dependencyFamilyLabel(family, locale)]

    const details = compactDependencyValues(
      matches.flatMap((value) => (value.value ? [value.value] : [])),
      locale,
      true,
    )
    return details.length > 0 ? [details.join(locale === 'zh-CN' ? '／' : ' / ')] : []
  }).join(' · ')
}

export function listLabel(
  values: readonly string[],
  formatter: (value: string, locale: Locale) => string,
  locale: Locale,
): string {
  return values.map((value) => formatter(value, locale)).join(locale === 'zh-CN' ? '、' : ', ')
}

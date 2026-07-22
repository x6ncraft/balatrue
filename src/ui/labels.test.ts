import { describe, expect, it } from 'vitest'

import type { GameDependency, GameEffectDetail, GameEffectValue } from '../game/clue-model'
import {
  compactDependenciesLabel,
  dependencyDetailsLabel,
  dependenciesLabel,
  effectDetailValuesLabel,
  effectDetailsLabel,
  effectValuesLabel,
  timingFamiliesLabel,
} from './labels'

const showmanDependencies: GameDependency[] = [
  { family: 'other_cards', value: 'joker' },
  { family: 'other_cards', value: 'consumable:planet' },
  { family: 'other_cards', value: 'consumable:spectral' },
  { family: 'other_cards', value: 'consumable:tarot' },
]

describe('compactDependenciesLabel', () => {
  it('collapses Showman into one readable board category', () => {
    expect(compactDependenciesLabel(showmanDependencies, 'zh-CN')).toBe('小丑／消耗牌')
    expect(compactDependenciesLabel([...showmanDependencies].reverse(), 'en')).toBe(
      'Jokers / consumables',
    )
  })

  it('keeps exact consumable details out of the board category', () => {
    expect(
      compactDependenciesLabel(
        [
          { family: 'other_cards', value: 'consumable:planet' },
          { family: 'other_cards', value: 'consumable:tarot' },
        ],
        'zh-CN',
      ),
    ).toBe('小丑／消耗牌')
    expect(
      compactDependenciesLabel([{ family: 'other_cards', value: 'consumable:any' }], 'zh-CN'),
    ).toBe('小丑／消耗牌')
  })

  it('does not change the full traceable label', () => {
    expect(dependenciesLabel(showmanDependencies, 'zh-CN')).toBe(
      '小丑／消耗牌：其他小丑、星球牌、幻灵牌、塔罗牌',
    )
  })
})

describe('player-facing clue labels', () => {
  it('uses concise Balatro-native English category terms', () => {
    expect(effectValuesLabel(['x_mult', 'economy', 'generate'], 'en')).toBe(
      'X Mult, Money, Create / copy',
    )
    expect(timingFamiliesLabel(['always', 'card_action', 'blind', 'shop'], 'en')).toBe(
      'Always active, Card actions, Blind events, Shop / packs',
    )
    expect(
      compactDependenciesLabel(
        [
          { family: 'cards', value: 'rank:face' },
          { family: 'hand', value: 'playing_card:first_scoring' },
        ],
        'en',
      ),
    ).toBe('Playing cards / deck · Played hand / poker hand')
  })

  it('keeps broad effects playable while preserving exact mechanisms for reference views', () => {
    const scopedRule: GameEffectValue[] = ['mechanic']
    expect(effectValuesLabel(scopedRule, 'zh-CN')).toBe('规则／再触发')
    expect(effectDetailsLabel(['generate:sealed_card'], 'zh-CN')).toBe('生成／复制：蜡封牌')
    expect(effectDetailValuesLabel(['rules:straight_gap'], 'zh-CN')).toBe('顺子间隔')
    expect(
      effectDetailValuesLabel(['generate:spectral', 'modify:destroy_playing_card'], 'zh-CN'),
    ).toBe('幻灵牌、摧毁扑克牌')
    expect(effectDetailValuesLabel(['modify:gold_card'], 'zh-CN')).toBe('黄金牌')
    expect(effectDetailValuesLabel(['chips'], 'zh-CN')).toBe('')
  })

  it('includes behavior details in the complete player-visible Effect clue', () => {
    const details: GameEffectDetail[] = ['mult', 'behavior:growth', 'behavior:reset']
    expect(effectDetailsLabel(details, 'zh-CN')).toBe('+倍率 · 成长 · 重置')
    expect(effectDetailValuesLabel(details, 'zh-CN')).toBe('成长、重置')
    expect(effectDetailsLabel(details, 'en')).toBe('+Mult · Scales up · Resets')
  })

  it('keeps timing as seven flat player phases', () => {
    expect(timingFamiliesLabel(['blind', 'round_boundary'], 'zh-CN')).toBe(
      '盲注阶段、回合开始／结束',
    )
    expect(timingFamiliesLabel(['hand_scored', 'card_scored'], 'en')).toBe(
      'Hand scored, Card scored',
    )
  })

  it('keeps every dependency dimension visible for multi-part conditions', () => {
    expect(
      compactDependenciesLabel(
        [
          { family: 'cards', value: 'rank:face_card' },
          { family: 'hand', value: 'playing_card:first_scoring' },
        ],
        'zh-CN',
      ),
    ).toBe('单牌／牌组 · 出牌／牌型')
    expect(
      dependencyDetailsLabel(
        [
          { family: 'cards', value: 'rank:face_card' },
          { family: 'hand', value: 'playing_card:first_scoring' },
        ],
        'zh-CN',
      ),
    ).toBe('人头牌、首张计分牌')
  })

  it('spells out every useful guessed-side dependency detail without judging each one', () => {
    expect(
      dependencyDetailsLabel(
        [
          { family: 'cards', value: 'rank:face' },
          { family: 'hand', value: 'playing_card:first_scoring' },
        ],
        'zh-CN',
      ),
    ).toBe('人头牌、首张计分牌')
  })

  it('recombines full-deck count atoms into natural player language', () => {
    const steel = { family: 'cards', value: 'card_modifier:steel' } as const
    const fullDeck = { family: 'cards', value: 'deck:full_count' } as const
    expect(dependencyDetailsLabel([steel, fullDeck], 'zh-CN')).toBe('全牌组中的钢铁牌数量')
    expect(dependencyDetailsLabel([steel, fullDeck], 'en')).toBe('Steel Cards in your full deck')
  })

  it('recombines complementary ability branches into one checked condition', () => {
    expect(
      dependencyDetailsLabel(
        [
          { family: 'cards', value: 'playing_card:no_scoring_face' },
          { family: 'cards', value: 'playing_card:scoring_face' },
        ],
        'zh-CN',
      ),
    ).toBe('是否含计分人头牌')
    expect(
      dependenciesLabel(
        [
          { family: 'hand', value: 'poker_hand:most_played' },
          { family: 'hand', value: 'poker_hand:not_most_played' },
        ],
        'en',
      ),
    ).toBe('Played hand / poker hand: Whether the hand is most-played')
  })

  it('shortens dense board details without changing their categories', () => {
    expect(
      compactDependenciesLabel(
        [
          { family: 'other_cards', value: 'joker:other_random' },
          { family: 'progress', value: 'round:elapsed_2' },
        ],
        'zh-CN',
      ),
    ).toBe('小丑／消耗牌 · 盲注／进度')
  })

  it('keeps exact English checks natural in the collection and glossary', () => {
    expect(dependenciesLabel([{ family: 'discard', value: 'discard:first' }], 'en')).toBe(
      'Discards: First discard each round',
    )
    expect(dependenciesLabel([{ family: 'progress', value: 'event:blind_selected' }], 'en')).toBe(
      'Blinds / progress: Selecting a Blind',
    )
  })
})

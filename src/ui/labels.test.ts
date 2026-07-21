import { describe, expect, it } from 'vitest'

import type { GameDependency, GameEffectValue } from '../game/clue-model'
import {
  compactDependenciesLabel,
  dependenciesLabel,
  effectMechanismsLabel,
  effectValuesLabel,
  narrowDependenciesLabel,
  narrowEffectValuesLabel,
  narrowTimingFamiliesLabel,
  partialDependencyDetailLabel,
  partialEffectDetailLabel,
  partialTimingDetailLabel,
  timingDetailsLabel,
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

describe('narrow board labels', () => {
  it('keeps 320px categories short without changing their order', () => {
    expect(narrowEffectValuesLabel(['generate', 'adjust'], 'en')).toBe('Create · Adjust')
    expect(narrowTimingFamiliesLabel(['hand_action', 'round_boundary'], 'zh-CN')).toBe(
      '手牌 · 回合',
    )
    expect(
      narrowDependenciesLabel(
        [
          { family: 'cards', value: 'rank:6' },
          { family: 'hand', value: 'hand:first_hand' },
          { family: 'other_cards', value: 'consumable:available_slot' },
        ],
        'en',
      ),
    ).toBe('Deck · Hand · Other cards')
  })
})

describe('player-facing clue labels', () => {
  it('uses concise Balatro-native English category terms', () => {
    expect(effectValuesLabel(['x_mult', 'economy', 'generate'], 'en')).toBe(
      'X Mult, Money, Create / copy',
    )
    expect(timingFamiliesLabel(['always', 'hand_action', 'blind', 'shop'], 'en')).toBe(
      'Always active, Play / hold / discard, Blind events, Shop / packs',
    )
    expect(
      compactDependenciesLabel(
        [
          { family: 'cards', value: 'rank:face' },
          { family: 'hand', value: 'playing_card:first_scoring' },
        ],
        'en',
      ),
    ).toBe('Card traits / deck · Played cards / poker hand')
  })

  it('keeps broad effects playable while preserving exact mechanisms for reference views', () => {
    const scopedRule: GameEffectValue[] = ['mechanic']
    expect(effectValuesLabel(scopedRule, 'zh-CN')).toBe('规则／再触发')
    expect(effectMechanismsLabel(['generate:sealed_card'], 'zh-CN')).toBe('生成：蜡封牌')
    expect(
      partialEffectDetailLabel(['rules:straight_gap'], [], ['rules:straight_gap'], 'zh-CN'),
    ).toBe('不同：顺子间隔')
  })

  it('separates timing categories from their exact events', () => {
    expect(timingFamiliesLabel(['blind', 'round_boundary'], 'zh-CN')).toBe('盲注阶段、回合交界')
    expect(timingDetailsLabel(['blind_skipped', 'round_end'], 'zh-CN')).toBe(
      '盲注阶段：跳过盲注；回合交界：回合结束',
    )
    expect(
      partialTimingDetailLabel(['hand_scored', 'card_management'], ['hand_scored'], 'zh-CN'),
    ).toBe('吻合：整手结算')
    expect(partialTimingDetailLabel(['hand_scored'], ['hand_scored'], 'zh-CN')).toBe('答案另有时机')
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
  })

  it('spells out every useful guessed-side detail in a yellow dependency cell', () => {
    expect(
      partialDependencyDetailLabel(
        [
          { family: 'cards', value: 'rank:face' },
          { family: 'hand', value: 'playing_card:first_scoring' },
        ],
        [],
        [
          { family: 'cards', value: 'rank:face' },
          { family: 'hand', value: 'playing_card:first_scoring' },
        ],
        'zh-CN',
      ),
    ).toBe('不同：人头牌、首张计分牌')
  })

  it('turns exact dependency subsets into a directional clue', () => {
    const face = { family: 'cards', value: 'rank:face' } as const
    expect(partialDependencyDetailLabel([face], [face], [], 'zh-CN')).toBe('答案另有条件')
    expect(partialDependencyDetailLabel([face], [face], [], 'en')).toBe(
      'Answer has another condition',
    )
  })

  it('recombines full-deck count atoms into natural player language', () => {
    const steel = { family: 'cards', value: 'card_modifier:steel' } as const
    const fullDeck = { family: 'cards', value: 'deck:full_count' } as const
    expect(partialDependencyDetailLabel([steel, fullDeck], [], [steel, fullDeck], 'zh-CN')).toBe(
      '不同：全牌组中的钢铁牌数量',
    )
    expect(partialDependencyDetailLabel([steel, fullDeck], [], [steel, fullDeck], 'en')).toBe(
      'Different: Steel Cards in your full deck',
    )
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
    ).toBe('小丑／消耗牌 · 盲注／回合')
  })

  it('keeps exact English conditions natural in the collection and glossary', () => {
    expect(dependenciesLabel([{ family: 'discard', value: 'discard:first' }], 'en')).toBe(
      'Discards: First discard each round',
    )
    expect(
      dependenciesLabel([{ family: 'other_cards', value: 'consumable:available_slot' }], 'en'),
    ).toBe('Jokers / consumables: Open consumable slot')
  })
})

import { describe, expect, it } from 'vitest'

import type { GameDependency } from '../game/clue-model'
import { compactDependenciesLabel, dependenciesLabel } from './labels'

const showmanDependencies: GameDependency[] = [
  { family: 'jokers', value: 'joker' },
  { family: 'consumables', value: 'consumable:planet' },
  { family: 'consumables', value: 'consumable:spectral' },
  { family: 'consumables', value: 'consumable:tarot' },
]

describe('compactDependenciesLabel', () => {
  it('collapses Showman into two readable semantic groups', () => {
    expect(compactDependenciesLabel(showmanDependencies, 'zh-CN')).toBe('其他小丑 · 三类消耗牌')
    expect(compactDependenciesLabel([...showmanDependencies].reverse(), 'en')).toBe(
      'Other Jokers · All 3 consumables',
    )
  })

  it('keeps a consumable subset and any-consumable distinct', () => {
    expect(
      compactDependenciesLabel(
        [
          { family: 'consumables', value: 'consumable:planet' },
          { family: 'consumables', value: 'consumable:tarot' },
        ],
        'zh-CN',
      ),
    ).toBe('星球牌／塔罗牌')
    expect(
      compactDependenciesLabel([{ family: 'consumables', value: 'consumable:any' }], 'zh-CN'),
    ).toBe('任意消耗牌')
  })

  it('does not change the full traceable label', () => {
    expect(dependenciesLabel(showmanDependencies, 'zh-CN')).toBe(
      '小丑/栏位：其他小丑；消耗牌：星球牌、幻灵牌、塔罗牌',
    )
  })
})

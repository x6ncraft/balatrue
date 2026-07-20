import { describe, expect, it } from 'vitest'

import type { Joker } from '../data/types'
import {
  buildJokerSearchIndex,
  createJokerCombobox,
  normalizeSearchText,
  searchJokers,
} from './index'

function joker(id: string, en: string, zhCN: string): Joker {
  return { id, name: { en, zhCN } } as Joker
}

const fixtures = [
  joker('j_joker', 'Joker', '小丑'),
  joker('j_stencil', 'Joker Stencil', '模具小丑'),
  joker('j_greedy', 'Greedy Joker', '贪婪小丑'),
  joker('j_blueprint', 'Blueprint', '蓝图'),
  joker('j_brainstorm', 'Brainstorm', '头脑风暴'),
  joker('j_mr_bones', 'Mr. Bones', '骷髅先生'),
] as const

const fixtureAliases = {
  j_joker: ['xiaochou', 'xc'],
  j_stencil: ['mojuxiaochou', 'mjxc'],
  j_greedy: ['tanlanxiaochou', 'tlxc'],
  j_blueprint: ['lantu', 'lt'],
  j_brainstorm: ['tounaofengbao', 'tnfb'],
  j_mr_bones: ['kulouxiansheng', 'klxs'],
} as const

const index = buildJokerSearchIndex(fixtures, fixtureAliases)

describe('normalizeSearchText', () => {
  it('normalizes case, whitespace, punctuation, and compatibility characters', () => {
    expect(normalizeSearchText('  ＭＲ.  Bones!! ')).toBe('mrbones')
    expect(normalizeSearchText('蓝 图！')).toBe('蓝图')
  })
})

describe('searchJokers', () => {
  it('fails closed when a Joker has no generated aliases', () => {
    expect(() => buildJokerSearchIndex(fixtures, {})).toThrow('Missing search aliases for j_joker')
  })

  it('finds official Chinese names', () => {
    expect(searchJokers(index, '蓝图').map(({ id }) => id)).toEqual(['j_blueprint'])
  })

  it('finds official English names without case or punctuation sensitivity', () => {
    const results = searchJokers(index, '  mr-bones!! ')

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ id: 'j_mr_bones', matchedField: 'en', matchKind: 'exact' })
  })

  it('finds Chinese names by full pinyin with optional spaces', () => {
    const results = searchJokers(index, 'tan lan xiao chou')

    expect(results[0]).toMatchObject({ id: 'j_greedy', matchedField: 'pinyin' })
  })

  it('finds Chinese names by pinyin initials', () => {
    const results = searchJokers(index, 'tnfb')

    expect(results[0]).toMatchObject({
      id: 'j_brainstorm',
      matchedField: 'initials',
      matchKind: 'exact',
    })
  })

  it('ranks exact, prefix, then contiguous matches', () => {
    expect(searchJokers(index, 'joker').map(({ id, matchKind }) => [id, matchKind])).toEqual([
      ['j_joker', 'exact'],
      ['j_stencil', 'prefix'],
      ['j_greedy', 'contiguous'],
    ])
  })

  it('preserves source order when matches have the same rank', () => {
    const stableIndex = buildJokerSearchIndex(
      [joker('j_zulu', 'Joker Zulu', '祖鲁小丑'), joker('j_alpha', 'Joker Alpha', '阿尔法小丑')],
      {
        j_zulu: ['zuluxiaochou', 'zlxc'],
        j_alpha: ['aerfaxiaochou', 'aefxc'],
      },
    )

    expect(searchJokers(stableIndex, 'joker').map(({ id }) => id)).toEqual(['j_zulu', 'j_alpha'])
  })

  it('uses the active locale for the primary and secondary labels', () => {
    expect(searchJokers(index, 'blue', { locale: 'zh-CN' })[0]).toMatchObject({
      primaryName: '蓝图',
      secondaryName: 'Blueprint',
    })
    expect(searchJokers(index, '蓝', { locale: 'en' })[0]).toMatchObject({
      primaryName: 'Blueprint',
      secondaryName: '蓝图',
    })
  })

  it('marks guessed Jokers as disabled or filters them on request', () => {
    const guessedIds = new Set(['j_blueprint'])

    expect(searchJokers(index, 'blue', { guessedIds })[0]?.disabled).toBe(true)
    expect(searchJokers(index, 'blue', { guessedIds, includeDisabled: false })).toEqual([])
  })

  it('returns every match by default while respecting an explicit limit', () => {
    expect(searchJokers(index, '  ---  ')).toEqual([])
    expect(searchJokers(index, 'j').map(({ id }) => id)).toEqual([
      'j_joker',
      'j_stencil',
      'j_greedy',
    ])
    expect(searchJokers(index, 'j', { limit: 2 })).toHaveLength(2)
  })
})

describe('createJokerCombobox', () => {
  it('provides selection-safe lookup functions for the Joker combobox', () => {
    const combobox = createJokerCombobox(index, {
      locale: 'en',
      guessedIds: ['j_blueprint'],
    })

    expect(combobox.getOptions('blue')[0]).toMatchObject({
      id: 'j_blueprint',
      primaryName: 'Blueprint',
      disabled: true,
    })
    expect(combobox.getById('j_blueprint')?.name.zhCN).toBe('蓝图')
    expect(combobox.canSelect('j_blueprint')).toBe(false)
    expect(combobox.canSelect('j_brainstorm')).toBe(true)
    expect(combobox.canSelect('missing')).toBe(false)
  })
})

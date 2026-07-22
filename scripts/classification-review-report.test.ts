// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { jokers } from '../src/data/jokers.generated'
import {
  projectJokerDependencies,
  projectJokerEffectCategories,
  projectJokerTimingFamilies,
} from '../src/game/clue-model'
import { getJokerEffectDetails } from '../src/game/joker-access'
import {
  compactDependenciesLabel,
  dependencyDetailsLabel,
  effectDetailValuesLabel,
  effectValuesLabel,
  rarityLabel,
  timingFamiliesLabel,
} from '../src/ui/labels'
import { jokerPriceLabel } from '../src/ui/joker-facts'
import { CLASSIFICATION_REVIEW_CASES } from './classification-review-cases'
import { generateClassificationReviewReport } from './classification-review-report'

function playerRows(report: string): string[] {
  return report.split('\n').filter((line) => /^\| \d{2} \|/.test(line))
}

function layered(category: string, details: string): string {
  return details ? `${category}<br>${details}` : category
}

describe('classification review report', () => {
  it('renders the complete registry once as one player-facing table', () => {
    const report = generateClassificationReviewReport(jokers)
    const rows = playerRows(report)
    const jokerById = new Map(jokers.map((joker) => [joker.id, joker]))

    expect(rows).toEqual(
      CLASSIFICATION_REVIEW_CASES.map(({ id }, index) => {
        const joker = jokerById.get(id)
        if (!joker) throw new Error(`Missing review Joker ${id}`)
        const effects = getJokerEffectDetails(joker)
        const dependencies = projectJokerDependencies(joker)
        return `${[
          `| ${String(index + 1).padStart(2, '0')}`,
          `${joker.name.zhCN}<br>${joker.name.en}`,
          rarityLabel(joker.official.rarity, 'zh-CN'),
          jokerPriceLabel(joker, 'zh-CN'),
          layered(
            effectValuesLabel(projectJokerEffectCategories(joker), 'zh-CN'),
            effectDetailValuesLabel(effects, 'zh-CN'),
          ),
          timingFamiliesLabel(projectJokerTimingFamilies(joker), 'zh-CN'),
          layered(
            compactDependenciesLabel(dependencies, 'zh-CN'),
            dependencyDetailsLabel(dependencies, 'zh-CN'),
          ),
        ].join(' | ')} |`
      }),
    )
    expect(rows).toHaveLength(61)
    expect(new Set(rows).size).toBe(61)
    expect(report).toContain('能力数据模型第 12 版')
    expect(report).toContain('玩家线索规则第 11 版')
    expect(report).toContain('复核范围：61 张重点牌')
    expect(report.endsWith('\n')).toBe(true)
  })

  it('is deterministic and contains no clock or Git-derived metadata', () => {
    const first = generateClassificationReviewReport(jokers)
    const second = generateClassificationReviewReport(structuredClone(jokers))

    expect(second).toBe(first)
    expect(first).not.toMatch(/generated at|commit [0-9a-f]{7,}/i)
  })

  it('shows the exact player-visible five dimensions without audit internals', () => {
    const report = generateClassificationReviewReport(jokers)
    const [hologram] = playerRows(report)

    expect(hologram).toBe(
      '| 01 | 全息影像<br>Hologram | 罕见 | $7 | ×倍率<br>成长 | 整手计分、卡牌动作 | 单牌／牌组<br>加入牌组 |',
    )
    expect(report).not.toContain('Raw:')
    expect(report).not.toContain('完整能力子句')
    expect(report).not.toMatch(/^## /m)
  })

  it('keeps compound player details readable inside their owning columns', () => {
    const report = generateClassificationReviewReport(jokers)
    const trousers = playerRows(report)[1]

    expect(trousers).toContain('| +倍率<br>成长 |')
    expect(trousers).toContain('| 整手计分、卡牌动作 |')
    expect(trousers).toContain('| 出牌／牌型<br>两对 |')
  })

  it('keeps lifecycle and long-list representatives explicit', () => {
    const report = generateClassificationReviewReport(jokers)

    expect(report).toContain('| 搭乘巴士<br>Ride the Bus | 普通 | $6 | +倍率<br>成长、重置 |')
    expect(report).toContain('| 方尖石塔<br>Obelisk | 稀有 | $8 | ×倍率<br>成长、重置 |')
    expect(report).toContain('| 苏打水<br>Seltzer | 罕见 | $6 | 规则／再触发<br>再触发、递减 |')
    expect(report).toContain('| 斐波那契<br>Fibonacci | 罕见 | $8 | +倍率 |')
    expect(report).toContain('| 烂脱口秀演员<br>Hack | 罕见 | $6 | 规则／再触发<br>再触发 |')
    expect(report).toContain('| 花盆<br>Flower Pot | 罕见 | $6 | ×倍率 |')
  })

  it('rejects missing or duplicate current Joker data', () => {
    expect(() =>
      generateClassificationReviewReport(jokers.filter(({ id }) => id !== 'j_hologram')),
    ).toThrow(/current data is missing registry Jokers: j_hologram/)
    expect(() => generateClassificationReviewReport([...jokers, jokers[0]!])).toThrow(
      /current data contains duplicate Joker/,
    )
  })
})

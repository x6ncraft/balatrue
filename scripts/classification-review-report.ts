import type { Joker } from '../src/data/types'
import { JOKER_CLASSIFICATION_VERSION } from '../src/data/types'
import {
  GAME_CLUE_MODEL_VERSION,
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

const EXPECTED_REVIEW_CASE_COUNT = 61

interface PlayerReviewFacts {
  rarity: string
  price: string
  effect: string
  timing: string
  dependency: string
}

function assertReviewInputs(jokers: readonly Joker[]): Map<string, Joker> {
  if (CLASSIFICATION_REVIEW_CASES.length !== EXPECTED_REVIEW_CASE_COUNT) {
    throw new Error(
      `[classification-review] expected ${EXPECTED_REVIEW_CASE_COUNT} registry cases, found ${CLASSIFICATION_REVIEW_CASES.length}`,
    )
  }

  const registryIds = CLASSIFICATION_REVIEW_CASES.map(({ id }) => id)
  if (new Set(registryIds).size !== registryIds.length) {
    throw new Error('[classification-review] registry contains duplicate Joker IDs')
  }

  const jokerById = new Map<string, Joker>()
  for (const joker of jokers) {
    if (jokerById.has(joker.id)) {
      throw new Error(`[classification-review] current data contains duplicate Joker ${joker.id}`)
    }
    jokerById.set(joker.id, joker)
  }

  const missingIds = registryIds.filter((id) => !jokerById.has(id))
  if (missingIds.length > 0) {
    throw new Error(
      `[classification-review] current data is missing registry Jokers: ${missingIds.join(', ')}`,
    )
  }
  return jokerById
}

function escapeTableCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', '<br>')
}

function layeredPlayerFact(category: string, detail: string): string {
  const categoryCell = escapeTableCell(category)
  const detailCell = escapeTableCell(detail)
  return detailCell ? `${categoryCell}<br>${detailCell}` : categoryCell
}

function playerFactValues(joker: Joker): PlayerReviewFacts {
  const effects = getJokerEffectDetails(joker)
  const dependencies = projectJokerDependencies(joker)
  return {
    rarity: rarityLabel(joker.official.rarity, 'zh-CN'),
    price: jokerPriceLabel(joker, 'zh-CN'),
    effect: layeredPlayerFact(
      effectValuesLabel(projectJokerEffectCategories(joker), 'zh-CN'),
      effectDetailValuesLabel(effects, 'zh-CN'),
    ),
    timing: timingFamiliesLabel(projectJokerTimingFamilies(joker), 'zh-CN'),
    dependency: layeredPlayerFact(
      compactDependenciesLabel(dependencies, 'zh-CN'),
      dependencyDetailsLabel(dependencies, 'zh-CN'),
    ),
  }
}

/** Deterministic player-facing review table generated from the current Joker data. */
export function generateClassificationReviewReport(jokers: readonly Joker[]): string {
  const jokerById = assertReviewInputs(jokers)
  const rows = CLASSIFICATION_REVIEW_CASES.map((reviewCase, index) => {
    const joker = jokerById.get(reviewCase.id)
    if (!joker) throw new Error(`[classification-review] missing ${reviewCase.id}`)

    const facts = playerFactValues(joker)
    const name = `${escapeTableCell(joker.name.zhCN)}<br>${escapeTableCell(joker.name.en)}`
    return `${[
      `| ${String(index + 1).padStart(2, '0')}`,
      name,
      escapeTableCell(facts.rarity),
      escapeTableCell(facts.price),
      facts.effect,
      facts.timing,
      facts.dependency,
    ].join(' | ')} |`
  })

  return [
    '# 重点牌玩家分类表',
    '',
    '> 本文件由 `bun run data:regenerate` 根据当前数据生成，禁止手改。',
    '',
    '这张表只展示玩家在棋盘、图鉴和线索字典中看到的最终五维。主效果与判定依据把大类写在前面、完整细项写在下面；触发时机只保留七个直观阶段。',
    '',
    `内部记录：能力数据模型第 ${JOKER_CLASSIFICATION_VERSION} 版；玩家线索规则第 ${GAME_CLUE_MODEL_VERSION} 版。复核范围：${CLASSIFICATION_REVIEW_CASES.length} 张重点牌。`,
    '',
    '| 序号 | 小丑牌 | 稀有度 | 基础价格 | 主效果 | 触发时机 | 判定依据 |',
    '| ---: | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n')
}

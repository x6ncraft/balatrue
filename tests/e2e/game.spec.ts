/// <reference types="node" />

import { readFileSync } from 'node:fs'

import { expect, test, type Page } from '@playwright/test'

import { JOKER_DATA_META, jokers } from '../../src/data'
import {
  createDailyGame,
  createPracticeGame,
  GAME_DEPENDENCY_FAMILIES,
  GAME_CLUE_MODEL_VERSION,
  GAME_EFFECT_CATEGORIES,
  GAME_TIMING_FAMILIES,
  gameStorageKey,
  getDailyAnswer,
  projectJokerDependencies,
  projectJokerEffectCategories,
  projectJokerTimingFamilies,
  serializeGameState,
  submitGuess,
} from '../../src/game'
import { buildJokerSearchIndex, searchJokers } from '../../src/search'

const packageManifest = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { readonly version: string }

const browserErrors = new WeakMap<Page, string[]>()
const currentPracticeStorageKey = gameStorageKey(
  JOKER_DATA_META.gameVersion,
  JOKER_DATA_META.classificationVersion,
  'practice',
  undefined,
  GAME_CLUE_MODEL_VERSION,
)

function jokerFixture(id: string) {
  const joker = jokers.find((candidate) => candidate.id === id)
  if (!joker) throw new Error(`Expected Joker fixture '${id}'`)
  return joker
}

async function submitJoker(page: Page, joker: (typeof jokers)[number]): Promise<void> {
  const search = page.getByRole('combobox', { name: '选择一张小丑牌' })
  await search.fill(joker.name.en)
  await page
    .getByRole('option', { name: `${joker.name.zhCN} ${joker.name.en}`, exact: true })
    .click()
  await page.getByRole('button', { name: '猜猜看' }).click()
}

async function startPracticeWithAnswer(
  page: Page,
  answerId: string,
  puzzleKey: string,
): Promise<void> {
  const answer = jokerFixture(answerId)
  const ordered = [...jokers].sort((left, right) => left.number - right.number)
  const answerIndex = ordered.findIndex((joker) => joker.id === answer.id)
  const state = createPracticeGame(jokers, () => (answerIndex + 0.5) / ordered.length, {
    puzzleKey,
  })

  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: currentPracticeStorageKey,
    value: serializeGameState(state),
  })
  await page.reload()
  await page.getByRole('button', { name: '无尽牌局' }).click()
}

function discardExpectedImageFailure(page: Page): void {
  const recordedErrors = browserErrors.get(page)
  if (!recordedErrors) return
  browserErrors.set(
    page,
    recordedErrors.filter((message) => !message.includes('ERR_FAILED')),
  )
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  browserErrors.set(page, errors)
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
})

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([])
})

test('starts clearly and supports pinyin autocomplete', async ({ page }) => {
  await expect(page.getByRole('region', { name: '猜猜今天是哪张小丑牌' })).toBeVisible()
  await expect(
    page.getByText('搜索想猜的牌，或从下方随手出一张；每次出牌都会给出五项线索。'),
  ).toBeVisible()
  await expect(page.getByText('6 次机会')).toBeVisible()

  const search = page.getByRole('combobox', { name: '选择一张小丑牌' })
  const chooseFirst = page.getByRole('button', { name: '先选牌' })
  const quickStart = page.getByRole('region', { name: '随手出一张作为第一猜' })
  await expect(search).toHaveAttribute('placeholder', '搜索小丑牌名…')
  await expect(search).not.toBeFocused()
  await expect(chooseFirst).toHaveAttribute('data-ready', 'false')
  await expect(quickStart.getByRole('button', { name: /作为第一猜$/ })).toHaveCount(5)

  await chooseFirst.click()
  await expect(search).toBeFocused()

  await search.fill('joker')
  await expect(quickStart).toBeHidden()
  const expectedBroadMatches = searchJokers(buildJokerSearchIndex(jokers), 'joker').length
  expect(expectedBroadMatches).toBeGreaterThan(8)
  await expect(page.getByRole('option')).toHaveCount(expectedBroadMatches)
  await search.press('End')
  await expect(page.getByRole('option').last()).toHaveAttribute('aria-selected', 'true')
  await search.press('Home')
  await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true')

  await search.fill('lantu')
  await search.dispatchEvent('compositionstart')
  await search.press('Enter')
  await expect(page.getByRole('article', { name: '蓝图' })).toHaveCount(0)
  await search.dispatchEvent('compositionend')
  await expect(page.getByRole('option', { name: '蓝图 Blueprint' })).toBeVisible()
  await page.getByRole('option', { name: '蓝图 Blueprint' }).click()
  await expect(page.getByRole('button', { name: '清除选择' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('已选择：蓝图')
  await expect(page.getByRole('button', { name: '猜猜看' })).toHaveAttribute('data-ready', 'true')
  await search.press('Enter')

  await expect(page.getByRole('article', { name: '蓝图' })).toBeVisible()
  await expect(page.getByText('剩余：5')).toBeVisible()
  await expect(search).toBeFocused()
  await expect(search).toHaveValue('')

  await search.fill('lantu')
  const repeated = page.getByRole('option').filter({ hasText: '蓝图' })
  await expect(repeated).toHaveAttribute('aria-disabled', 'true')
})

test('rerolls all five quick choices and starts with one tap', async ({ page }) => {
  const quickStart = page.getByRole('region', { name: '随手出一张作为第一猜' })
  const quickCards = quickStart.getByRole('button', { name: /作为第一猜$/ })
  const before = await quickCards.evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('aria-label')),
  )

  await quickStart.getByRole('button', { name: '换一组随机牌' }).click()

  await expect
    .poll(() =>
      quickCards.evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute('aria-label')),
      ),
    )
    .not.toEqual(before)
  const after = await quickCards.evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('aria-label')),
  )
  expect(after).toHaveLength(5)
  expect(after.every((label) => !before.includes(label))).toBe(true)

  await quickCards.first().click()
  await expect(quickStart).toBeHidden()
  await expect(page.locator('.guess-row')).toHaveCount(1)
})

test('keeps the deliberate bilingual brand offset and only divides real feedback', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.evaluate(() => document.fonts.ready)

  const brandCenters = await page.locator('.brand').evaluate((brand) => {
    const latin = brand.querySelector('.brand__name')?.getBoundingClientRect()
    const chinese = brand.querySelector('.brand__zh')?.getBoundingClientRect()
    return {
      latin: latin ? latin.y + latin.height / 2 : null,
      chinese: chinese ? chinese.y + chinese.height / 2 : null,
    }
  })
  expect(brandCenters.latin).not.toBeNull()
  expect(brandCenters.chinese).not.toBeNull()
  expect((brandCenters.chinese ?? 0) - (brandCenters.latin ?? 0)).toBeCloseTo(2, 1)

  const cardHead = page.locator('.game-card__head')
  await expect(page.locator('.guess-area')).toHaveCount(0)
  await expect(cardHead).toHaveCSS('border-bottom-width', '0px')

  await page
    .getByRole('region', { name: '随手出一张作为第一猜' })
    .getByRole('button', { name: /作为第一猜$/ })
    .first()
    .click()
  await expect(page.locator('.guess-area')).toBeVisible()
  await expect(cardHead).toHaveCSS('border-bottom-width', '1px')
})

test('retries a transient Joker image failure with a fresh URL', async ({ page }) => {
  let requestCount = 0
  const requestTimes: number[] = []
  await page.route('**/jokers/j_cloud_9.png*', async (route) => {
    requestCount += 1
    requestTimes.push(Date.now())
    if (requestCount === 1) {
      await route.abort('failed')
      return
    }
    await route.continue()
  })

  const search = page.getByRole('combobox', { name: '选择一张小丑牌' })
  await search.fill('9霄云外')
  const cloudNineImage = page
    .getByRole('option', { name: '9霄云外 Cloud 9' })
    .locator('.suggestion__image')
  await expect(cloudNineImage).toHaveAttribute('src', /retry=1/)
  await expect
    .poll(() =>
      cloudNineImage.evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth),
    )
    .toBeGreaterThan(0)
  expect(requestCount).toBe(2)
  expect((requestTimes[1] ?? 0) - (requestTimes[0] ?? 0)).toBeGreaterThanOrEqual(300)
  discardExpectedImageFailure(page)
})

test('uses a quiet placeholder after two failed decorative image requests', async ({ page }) => {
  let requestCount = 0
  await page.route('**/jokers/j_cloud_9.png*', async (route) => {
    requestCount += 1
    await route.abort('failed')
  })

  const search = page.getByRole('combobox', { name: '选择一张小丑牌' })
  await search.fill('9霄云外')
  const cloudNineOption = page.getByRole('option', { name: '9霄云外 Cloud 9' })
  const fallback = cloudNineOption.locator('.joker-image--unavailable')
  await expect(fallback).toHaveAttribute('aria-hidden', 'true')
  await expect(cloudNineOption.locator('[role="img"]')).toHaveCount(0)
  await page.waitForTimeout(600)
  expect(requestCount).toBe(2)
  discardExpectedImageFailure(page)
})

test('keeps Showman output categories out of its dependency clue', async ({ page }) => {
  const search = page.getByRole('combobox', { name: '选择一张小丑牌' })
  await search.fill('马戏团长')
  await page.getByRole('option', { name: '马戏团长 Showman' }).click()
  await page.getByRole('button', { name: '猜猜看' }).click()

  const cells = page.getByRole('article', { name: '马戏团长' }).locator('.feedback-cell')
  await expect(cells.nth(2).locator('.feedback-cell__value')).toHaveText('规则／再触发')
  await expect(cells.nth(4)).toContainText('无需额外条件')
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
})

test('uses broad board categories while preserving exact reference details', async ({ page }) => {
  await startPracticeWithAnswer(page, 'j_stone', 'practice:g9-board-semantics')

  const fixtures = [
    {
      joker: jokerFixture('j_certificate'),
      effect: '生成',
      effectDetail: '蜡封牌',
      timing: '回合交界',
      timingDetail: '回合开始',
      dependency: '无需额外条件',
    },
    {
      joker: jokerFixture('j_four_fingers'),
      effect: '规则／再触发',
      effectDetail: '顺子／同花张数',
      timing: '持续生效',
      dependency: '无需额外条件',
    },
    {
      joker: jokerFixture('j_shortcut'),
      effect: '规则／再触发',
      effectDetail: '顺子间隔',
      timing: '持续生效',
      dependency: '无需额外条件',
    },
    {
      joker: jokerFixture('j_photograph'),
      effect: '×倍率',
      timing: '逐牌计分',
      timingDetail: '单牌计分',
      dependency: '单牌／牌组 · 出牌／牌型',
      dependencyDetail: '人头牌、首张计分牌',
    },
  ]

  for (const fixture of fixtures) {
    await submitJoker(page, fixture.joker)
    const cells = page
      .getByRole('article', { name: fixture.joker.name.zhCN })
      .locator('.feedback-cell')
    await expect(cells.nth(2).locator('.feedback-cell__value')).toHaveText(fixture.effect)
    if ('effectDetail' in fixture && fixture.effectDetail) {
      await expect(cells.nth(2).locator('.feedback-cell__detail')).toHaveText(fixture.effectDetail)
    }
    await expect(cells.nth(3).locator('.feedback-cell__value')).toHaveText(fixture.timing)
    if ('timingDetail' in fixture && fixture.timingDetail) {
      await expect(cells.nth(3).locator('.feedback-cell__detail')).toHaveText(fixture.timingDetail)
    }
    await expect(cells.nth(4).locator('.feedback-cell__value')).toHaveText(fixture.dependency)
    if ('dependencyDetail' in fixture && fixture.dependencyDetail) {
      await expect(cells.nth(4).locator('.feedback-cell__detail')).toHaveText(
        fixture.dependencyDetail,
      )
    }
  }

  const photographDependency = page
    .getByRole('article', { name: '照片' })
    .locator('.feedback-cell')
    .nth(4)
  await expect(photographDependency).toHaveAttribute(
    'aria-label',
    /依赖条件：单牌／牌组 · 出牌／牌型，部分吻合，细项：人头牌、首张计分牌/,
  )
  await expect(photographDependency.locator('.feedback-cell__detail')).toHaveText(
    '人头牌、首张计分牌',
  )
})

test('shows the guessed dependency category and complete guessed-side detail in yellow', async ({
  page,
}) => {
  await startPracticeWithAnswer(page, 'j_mime', 'practice:yellow-dependency-detail')
  await submitJoker(page, jokerFixture('j_midas_mask'))

  const row = page.getByRole('article', { name: '迈达斯面具' })
  const dependency = row.locator('.feedback-cell').nth(4)
  await expect(dependency).toHaveClass(/feedback-cell--partial/)
  await expect(dependency.locator('.feedback-cell__value')).toHaveText('单牌／牌组')
  await expect(dependency.locator('.feedback-cell__detail')).toHaveText('人头牌')
  await expect(dependency).toHaveAttribute(
    'aria-label',
    /依赖条件：单牌／牌组，部分吻合，细项：人头牌/,
  )
  await expect(row.getByText('手牌中的能力', { exact: true })).toHaveCount(0)
})

test('keeps a guessed dependency detail unchanged across different yellow answers', async ({
  page,
}) => {
  await startPracticeWithAnswer(page, 'j_photograph', 'practice:yellow-exact-subset')
  await submitJoker(page, jokerFixture('j_midas_mask'))

  const row = page.getByRole('article', { name: '迈达斯面具' })
  const dependency = row.locator('.feedback-cell').nth(4)
  await expect(dependency).toHaveClass(/feedback-cell--partial/)
  await expect(dependency.locator('.feedback-cell__detail')).toHaveText('人头牌')
  await expect(row.getByText('首张计分牌', { exact: true })).toHaveCount(0)
})

test('shows a guessed-side mechanism for a yellow main effect', async ({ page }) => {
  await startPracticeWithAnswer(page, 'j_certificate', 'practice:yellow-effect-detail')
  await submitJoker(page, jokerFixture('j_marble'))

  const effect = page.getByRole('article', { name: '大理石小丑' }).locator('.feedback-cell').nth(2)
  await expect(effect).toHaveClass(/feedback-cell--partial/)
  await expect(effect.locator('.feedback-cell__value')).toHaveText('生成')
  const detail = effect.locator('.feedback-cell__detail')
  await expect(detail).toHaveText('石头牌')
  await expect(detail).toBeVisible()
  await expect(effect).toHaveAttribute('aria-label', /细项：石头牌/)
})

test('keeps guessed-side yellow details inside their feedback cells on mobile', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium')
  await startPracticeWithAnswer(page, 'j_chaos', 'practice:yellow-cell-placement')
  await submitJoker(page, jokerFixture('j_midas_mask'))

  const row = page.getByRole('article', { name: '迈达斯面具' })
  const effect = row.locator('.feedback-cell').nth(2)
  const detail = effect.locator('.feedback-cell__detail')
  await expect(effect).toHaveClass(/feedback-cell--partial/)
  await expect(effect.locator('.feedback-cell__value')).toHaveText('改牌／资源')
  await expect(detail).toHaveText('黄金牌')
  await expect(row.locator('.guess-row__details')).toHaveCount(0)
  await expect(row.locator('[data-compact-value]')).toHaveCount(0)

  for (const width of [430, 375, 320]) {
    await page.setViewportSize({ width, height: 568 })
    await expect(detail).toBeVisible()
    const [cellBox, detailBox] = await Promise.all([effect.boundingBox(), detail.boundingBox()])
    expect(cellBox).not.toBeNull()
    expect(detailBox).not.toBeNull()
    expect(detailBox?.x ?? 0).toBeGreaterThanOrEqual((cellBox?.x ?? 0) - 1)
    expect((detailBox?.x ?? 0) + (detailBox?.width ?? 0)).toBeLessThanOrEqual(
      (cellBox?.x ?? 0) + (cellBox?.width ?? 0) + 1,
    )
    expect(detailBox?.y ?? 0).toBeGreaterThanOrEqual((cellBox?.y ?? 0) - 1)
    expect((detailBox?.y ?? 0) + (detailBox?.height ?? 0)).toBeLessThanOrEqual(
      (cellBox?.y ?? 0) + (cellBox?.height ?? 0) + 1,
    )
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
  }

  await page.getByRole('button', { name: '选择界面语言：EN' }).click()
  const englishEffect = page
    .getByRole('article', { name: 'Midas Mask' })
    .locator('.feedback-cell')
    .nth(2)
  await expect(englishEffect.locator('.feedback-cell__value')).toHaveText('Card / resource changes')
  await expect(englishEffect.locator('.feedback-cell__detail')).toHaveText('Gold cards')
  await expect(englishEffect).toHaveAttribute('aria-label', /Detail: Gold cards/)

  const englishRarity = page
    .getByRole('article', { name: 'Midas Mask' })
    .locator('.feedback-cell')
    .nth(0)
  const englishRarityValue = englishRarity.locator('.feedback-cell__value')
  const englishRarityDirection = englishRarity.locator('.feedback-cell__direction')
  await expect(englishRarityValue).toHaveText('Uncommon')
  await expect(englishRarityDirection).toHaveText('↓')

  for (const width of [430, 375, 320]) {
    await page.setViewportSize({ width, height: 568 })
    const [cellBox, valueBox, directionBox] = await Promise.all([
      englishRarity.boundingBox(),
      englishRarityValue.boundingBox(),
      englishRarityDirection.boundingBox(),
    ])
    expect(cellBox).not.toBeNull()
    expect(valueBox).not.toBeNull()
    expect(directionBox).not.toBeNull()
    expect((valueBox?.x ?? 0) + (valueBox?.width ?? 0)).toBeLessThanOrEqual(
      (directionBox?.x ?? 0) + 0.5,
    )
    expect((directionBox?.x ?? 0) + (directionBox?.width ?? 0)).toBeLessThanOrEqual(
      (cellBox?.x ?? 0) + (cellBox?.width ?? 0) + 1,
    )
  }
})

test('shows complete guessed timing and condition details without comparison copy', async ({
  page,
}) => {
  await startPracticeWithAnswer(page, 'j_lucky_cat', 'practice:yellow-natural-language')
  await submitJoker(page, jokerFixture('j_hologram'))
  await submitJoker(page, jokerFixture('j_steel_joker'))

  const hologramTiming = page
    .getByRole('article', { name: '全息影像' })
    .locator('.feedback-cell')
    .nth(3)
  await expect(hologramTiming).toHaveClass(/feedback-cell--partial/)
  await expect(hologramTiming.locator('.feedback-cell__detail')).toHaveText('整手计分、加入牌组时')

  const steelRow = page.getByRole('article', { name: '钢铁小丑' })
  await expect(
    steelRow.locator('.feedback-cell').nth(3).locator('.feedback-cell__detail'),
  ).toHaveText('整手计分')
  await expect(
    steelRow.locator('.feedback-cell').nth(4).locator('.feedback-cell__detail'),
  ).toHaveText('全牌组中的钢铁牌数量')
  await expect(steelRow).not.toContainText('+1')
  await expect(steelRow).not.toContainText(/吻合|未吻合|不同|答案另有/)
  await expect(page.getByRole('article', { name: '全息影像' })).not.toContainText(
    /吻合|未吻合|不同|答案另有/,
  )

  await page.getByRole('button', { name: '选择界面语言：EN' }).click()
  await expect(page.locator('.guess-header')).toContainText('Effect')
  await expect(page.locator('.guess-header')).toContainText('Trigger')
  await expect(page.locator('.guess-header')).toContainText('Condition')
  const steelRowEnglish = page.getByRole('article', { name: 'Steel Joker' })
  const steelRarityEnglish = steelRowEnglish
    .locator('.feedback-cell')
    .nth(0)
    .locator('.feedback-cell__value')
  await expect(steelRarityEnglish).toHaveText('Uncommon')
  expect(
    await steelRarityEnglish.evaluate((value) => {
      const styles = getComputedStyle(value)
      return value.getBoundingClientRect().height <= Number.parseFloat(styles.lineHeight) * 1.1
    }),
  ).toBe(true)
  await expect(
    steelRowEnglish.locator('.feedback-cell').nth(3).locator('.feedback-cell__detail'),
  ).toHaveText('Hand scored')
  const steelConditionEnglish = steelRowEnglish
    .locator('.feedback-cell')
    .nth(4)
    .locator('.feedback-cell__detail')
  await expect(steelConditionEnglish).toHaveText('Steel Cards in your full deck')
  await expect(steelRowEnglish.locator('.feedback-cell').nth(4)).toHaveAttribute(
    'aria-label',
    /Detail: Steel Cards in your full deck/,
  )
  await expect(steelRowEnglish).not.toContainText(/Matches|Different|No match|Answer has/)
  await expect(page.getByRole('article', { name: 'Hologram' })).not.toContainText(
    /Matches|Different|No match|Answer has/,
  )
  const clippedEnglishDetail = await steelConditionEnglish.evaluate(
    (detail) => detail.scrollHeight > detail.clientHeight + 1,
  )
  expect(clippedEnglishDetail).toBe(false)
})

test('recomputes c10:g6 feedback under c11:g9 board semantics', async ({ page }) => {
  const answer = jokers.find((joker) => joker.id === 'j_stone')
  const guess = jokers.find((joker) => joker.id === 'j_certificate')
  if (!answer || !guess) throw new Error('Expected Certificate migration fixtures')

  const answerIndex = [...jokers]
    .sort((left, right) => left.number - right.number)
    .findIndex((joker) => joker.id === answer.id)
  const initial = createPracticeGame(jokers, () => (answerIndex + 0.5) / jokers.length, {
    puzzleKey: 'practice:c9-g4-semantics',
  })
  const played = submitGuess(initial, guess, answer)
  const comparison = played.guesses[0]
  if (!comparison) throw new Error('Expected one comparison')
  const oldState = {
    ...played,
    guesses: [
      {
        ...comparison,
        effects: {
          values: ['create_playing_card'],
          matches: [],
          result: 'miss' as const,
        },
        timings: { values: ['round_boundary'], matches: [], result: 'miss' as const },
        dependencies: {
          values: [{ family: 'none' as const }],
          exactMatches: [],
          familyMatches: [],
          result: 'miss' as const,
        },
      },
    ],
  }
  const oldKey = gameStorageKey(JOKER_DATA_META.gameVersion, 10, 'practice', undefined, 6)
  const currentKey = gameStorageKey(
    JOKER_DATA_META.gameVersion,
    JOKER_DATA_META.classificationVersion,
    'practice',
    undefined,
    GAME_CLUE_MODEL_VERSION,
  )

  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: oldKey,
    value: JSON.stringify(oldState),
  })
  await page.reload()
  await page.getByRole('button', { name: '无尽牌局' }).click()

  const cells = page.getByRole('article', { name: '证书' }).locator('.feedback-cell')
  await expect(cells.nth(2).locator('.feedback-cell__value')).toHaveText('生成')
  await expect(cells.nth(3).locator('.feedback-cell__value')).toHaveText('回合交界')
  await expect(cells.nth(4).locator('.feedback-cell__value')).toHaveText('无需额外条件')
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const stored = localStorage.getItem(key)
        if (!stored) return null
        const guess = (
          JSON.parse(stored) as {
            guesses?: {
              effects?: { values?: string[] }
              timings?: { values?: string[] }
              dependencies?: { values?: { family?: string; value?: string }[] }
            }[]
          }
        ).guesses?.[0]
        return guess
          ? {
              effects: guess.effects?.values,
              timings: guess.timings?.values,
              dependencies: guess.dependencies?.values,
            }
          : null
      }, currentKey),
    )
    .toEqual({
      effects: ['generate'],
      timings: ['round_boundary'],
      dependencies: [{ family: 'none' }],
    })
})

test('migrates c10:g7 without losing the active daily game', async ({ page }) => {
  const oldState = createDailyGame(jokers)
  const oldKey = gameStorageKey(JOKER_DATA_META.gameVersion, 10, 'daily', oldState.puzzleKey, 7)
  const currentKey = gameStorageKey(
    JOKER_DATA_META.gameVersion,
    JOKER_DATA_META.classificationVersion,
    'daily',
    oldState.puzzleKey,
    GAME_CLUE_MODEL_VERSION,
  )

  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: oldKey,
    value: serializeGameState(oldState),
  })
  await page.reload()

  await expect(page.getByText('6 次机会')).toBeVisible()
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), currentKey))
    .not.toBeNull()
})

test('replays c11:g8 guesses under c11:g9 exact-trigger semantics', async ({ page }) => {
  const answer = jokerFixture('j_lucky_cat')
  const guess = jokerFixture('j_steel_joker')
  const ordered = [...jokers].sort((left, right) => left.number - right.number)
  const answerIndex = ordered.findIndex((joker) => joker.id === answer.id)
  const initial = createPracticeGame(jokers, () => (answerIndex + 0.5) / ordered.length, {
    puzzleKey: 'practice:c11-g8-to-g9',
  })
  const played = submitGuess(initial, guess, answer)
  const legacyState = {
    ...played,
    guesses: played.guesses.map((comparison) => ({
      ...comparison,
      timings: {
        ...comparison.timings,
        result: 'exact' as const,
      },
    })),
  }
  const oldKey = gameStorageKey(JOKER_DATA_META.gameVersion, 11, 'practice', undefined, 8)
  const currentKey = gameStorageKey(
    JOKER_DATA_META.gameVersion,
    JOKER_DATA_META.classificationVersion,
    'practice',
    undefined,
    GAME_CLUE_MODEL_VERSION,
  )

  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: oldKey,
    value: JSON.stringify(legacyState),
  })
  await page.reload()
  await page.getByRole('button', { name: '无尽牌局' }).click()

  const timing = page
    .getByRole('article', { name: guess.name.zhCN })
    .locator('.feedback-cell')
    .nth(3)
  await expect(timing).toHaveClass(/feedback-cell--partial/)
  await expect(timing.locator('.feedback-cell__value')).toHaveText('整手结算')
  await expect(timing.locator('.feedback-cell__detail')).toHaveText('整手计分')
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const stored = localStorage.getItem(key)
        if (!stored) return null
        return (
          JSON.parse(stored) as {
            guesses?: { timings?: { result?: string } }[]
          }
        ).guesses?.[0]?.timings?.result
      }, currentKey),
    )
    .toBe('partial')
})

test('replays g3 Soul-price feedback with the new direction', async ({ page }) => {
  const answer = jokers.find((joker) => joker.classification.acquisition.kind === 'soul')
  const guess = jokers.find(
    (joker) => joker.classification.acquisition.kind === 'shop' && joker.official.cost === 10,
  )
  if (!answer || !guess) throw new Error('Expected Soul and $10 fixtures')

  const answerIndex = [...jokers]
    .sort((left, right) => left.number - right.number)
    .findIndex((joker) => joker.id === answer.id)
  const initial = createPracticeGame(jokers, () => (answerIndex + 0.5) / jokers.length, {
    puzzleKey: 'practice:g3-soul-price',
  })
  const currentComparison = submitGuess(initial, guess, answer).guesses[0]
  if (!currentComparison) throw new Error('Expected one comparison')
  const oldState = {
    ...submitGuess(initial, guess, answer),
    guesses: [
      {
        ...currentComparison,
        acquisition: { ...currentComparison.acquisition, direction: null },
      },
    ],
  }
  const oldKey = gameStorageKey(JOKER_DATA_META.gameVersion, 9, 'practice', undefined, 3)
  const legacyUnversionedKey = gameStorageKey(JOKER_DATA_META.gameVersion, 9, 'practice')
  const currentKey = gameStorageKey(
    JOKER_DATA_META.gameVersion,
    JOKER_DATA_META.classificationVersion,
    'practice',
    undefined,
    GAME_CLUE_MODEL_VERSION,
  )

  await page.evaluate(
    ({ oldKey, oldValue, legacyKey, legacyValue }) => {
      localStorage.setItem(oldKey, oldValue)
      localStorage.setItem(legacyKey, legacyValue)
    },
    {
      oldKey,
      oldValue: serializeGameState(oldState),
      legacyKey: legacyUnversionedKey,
      legacyValue: serializeGameState(initial),
    },
  )
  await page.reload()
  await page.getByRole('button', { name: '无尽牌局' }).click()

  const price = page
    .getByRole('article', { name: guess.name.zhCN })
    .locator('.feedback-cell')
    .nth(1)
  await expect(price).toContainText(`$${guess.official.cost}↑`)
  await expect(price).toHaveAttribute('aria-label', /更高/)
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const stored = localStorage.getItem(key)
        if (!stored) return null
        return (JSON.parse(stored) as { guesses?: { acquisition?: { direction?: string } }[] })
          .guesses?.[0]?.acquisition?.direction
      }, currentKey),
    )
    .toBe('up')
})

test('continues the previous clue model practice bag in order', async ({ page }) => {
  const expectedAnswer = jokers[42]
  const nextAnswer = jokers[87]
  if (!expectedAnswer || !nextAnswer) throw new Error('Expected practice bag fixtures')
  const oldBagKey = `balatrue:practice-bag:${JOKER_DATA_META.gameVersion}:c8:g2`
  const currentBagKey = `balatrue:practice-bag:${JOKER_DATA_META.gameVersion}:c${JOKER_DATA_META.classificationVersion}:g${GAME_CLUE_MODEL_VERSION}`
  const currentGameKey = gameStorageKey(
    JOKER_DATA_META.gameVersion,
    JOKER_DATA_META.classificationVersion,
    'practice',
    undefined,
    GAME_CLUE_MODEL_VERSION,
  )

  await page.evaluate(({ key, ids }) => localStorage.setItem(key, JSON.stringify(ids)), {
    key: oldBagKey,
    ids: [expectedAnswer.id, nextAnswer.id],
  })
  await page.getByRole('button', { name: '无尽牌局' }).click()

  await expect
    .poll(() =>
      page.evaluate((key) => {
        const raw = localStorage.getItem(key)
        return raw ? (JSON.parse(raw) as { answerId?: string }).answerId : null
      }, currentGameKey),
    )
    .toBe(expectedAnswer.id)
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), currentBagKey))
    .toBe(JSON.stringify([nextAnswer.id]))
})

test('can finish, share, and restore the daily puzzle with the keyboard', async ({ page }) => {
  const answer = getDailyAnswer(jokers)
  const search = page.getByRole('combobox', { name: '选择一张小丑牌' })

  await search.fill(answer.name.en)
  await search.press('Enter')
  await search.press('Enter')

  await expect(page.getByRole('heading', { name: answer.name.zhCN })).toBeVisible()
  await expect(page.getByText('猜中了！')).toBeVisible()
  await expect(page.locator('.result-banner__facts > div')).toHaveCount(5)

  await page.getByRole('button', { name: '分享结果' }).click()
  await expect(page.getByRole('button', { name: '已复制' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: answer.name.zhCN })).toBeVisible()
  await expect(page.getByText('猜中了！')).toBeVisible()

  const statsButton = page.getByRole('button', { name: '战绩' })
  await statsButton.click()
  const statsDialog = page.getByRole('dialog', { name: '战绩' })
  await expect(page.locator('.app-shell')).toHaveAttribute('inert', '')
  await expect(statsDialog.getByText('100%')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(statsDialog).toBeHidden()
  await expect(page.locator('.app-shell')).not.toHaveAttribute('inert', '')
  await expect(statsButton).toBeFocused()
})

test('reveals the answer after six wrong guesses', async ({ page }) => {
  const answer = getDailyAnswer(jokers)
  const wrongGuesses = jokers.filter((joker) => joker.id !== answer.id).slice(0, 6)
  const search = page.getByRole('combobox', { name: '选择一张小丑牌' })

  for (const joker of wrongGuesses) {
    await search.fill(joker.name.en)
    await page
      .getByRole('option', { name: `${joker.name.zhCN} ${joker.name.en}`, exact: true })
      .click()
    await page.getByRole('button', { name: '猜猜看' }).click()
  }

  await expect(page.getByText('差一点')).toBeVisible()
  await expect(page.getByRole('heading', { name: answer.name.zhCN })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(6)
})

test('switches the full interface to English and opens practice mode', async ({ page }) => {
  const search = page.getByRole('combobox', { name: '选择一张小丑牌' })
  await search.fill('not-a-joker')
  await page.getByRole('button', { name: '先选牌' }).click()
  await expect(page.getByText('请从联想结果中选择一张牌。')).toBeVisible()
  await page.getByRole('button', { name: '选择界面语言：EN' }).click()
  await expect(page.getByRole('region', { name: "Guess today's Joker" })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Choose a Joker' })).toBeVisible()
  await expect(page.getByText('Choose a Joker from the suggestions first.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Choose first' })).toHaveAttribute(
    'data-ready',
    'false',
  )

  await page.getByRole('button', { name: 'Endless' }).click()
  await expect(page.getByRole('region', { name: 'Endless' })).toBeVisible()
  await expect(page.getByText('6 guesses')).toBeVisible()

  await page.getByRole('button', { name: 'Clue glossary' }).click()
  const glossary = page.getByRole('dialog', { name: 'Clue glossary' })
  for (const heading of ['Effect', 'Trigger', 'Condition']) {
    await expect(glossary.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }
  for (const category of [
    'Money',
    'Create / copy',
    'Always active',
    'Play / hold / discard',
    'Blind events',
    'Shop / packs',
    'Round start / end',
    'Card traits / deck',
    'Played cards / poker hand',
  ]) {
    await expect(glossary.getByText(category, { exact: true }).first()).toBeVisible()
  }
})

test('explains every clue family without affecting the score', async ({ page }) => {
  await page.getByRole('button', { name: '线索字典' }).click()

  const dialog = page.getByRole('dialog', { name: '线索字典' })
  await expect(dialog).toBeVisible()
  for (const heading of ['稀有度', '基础价格', '主效果', '触发时机', '依赖条件']) {
    await expect(dialog.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }
  await expect(dialog.getByText('普通', { exact: true })).toBeVisible()

  expect(GAME_EFFECT_CATEGORIES).toHaveLength(7)
  const effectSection = dialog.locator('section[aria-labelledby="effect-glossary-title"]')
  await expect(effectSection.getByText('7 类', { exact: true })).toBeVisible()
  const generateEffectCount = jokers.filter((joker) =>
    projectJokerEffectCategories(joker).includes('generate'),
  ).length
  const generateEffectEntry = effectSection.getByRole('article', { name: '生成', exact: true })
  await expect(
    generateEffectEntry.getByText(`${generateEffectCount} 张`, { exact: true }),
  ).toBeVisible()
  for (const detail of ['石头牌', '复制扑克牌', '蜡封牌']) {
    await expect(generateEffectEntry.getByText(detail, { exact: true })).toBeVisible()
  }
  const adjustEffectEntry = effectSection.getByRole('article', {
    name: '改牌／资源',
    exact: true,
  })
  await expect(adjustEffectEntry.getByText('黄金牌', { exact: true })).toBeVisible()

  expect(GAME_TIMING_FAMILIES).toHaveLength(8)
  const timingSection = dialog.locator('section[aria-labelledby="timing-glossary-title"]')
  await expect(timingSection.getByText('8 类', { exact: true })).toBeVisible()
  const shopTimingCount = jokers.filter((joker) =>
    projectJokerTimingFamilies(joker).includes('shop'),
  ).length
  const shopTimingEntry = timingSection.locator('.glossary-entry').filter({ hasText: '商店相关' })
  await expect(shopTimingEntry.getByText(`${shopTimingCount} 张`, { exact: true })).toBeVisible()
  for (const detail of ['商店中', '打开补充包', '跳过补充包', '商店重掷', '离开商店', '出售卡牌']) {
    await expect(shopTimingEntry.getByText(detail, { exact: true })).toBeVisible()
  }

  expect(GAME_DEPENDENCY_FAMILIES).toHaveLength(7)
  const dependencySection = dialog.locator('section[aria-labelledby="dependency-glossary-title"]')
  await expect(dependencySection.getByText('7 类', { exact: true })).toBeVisible()
  const playedCardsCount = jokers.filter((joker) =>
    projectJokerDependencies(joker).some((dependency) => dependency.family === 'hand'),
  ).length
  const playedCardsEntry = dependencySection.getByRole('article', {
    name: '出牌／牌型',
    exact: true,
  })
  await expect(playedCardsEntry.getByText(`${playedCardsCount} 张`, { exact: true })).toBeVisible()
  await expect(playedCardsEntry.getByText('牌型', { exact: true })).toBeVisible()
  await expect(playedCardsEntry.getByText('出牌情况', { exact: true })).toBeVisible()
  await expect(playedCardsEntry.getByText('首张计分牌', { exact: true })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByText('图鉴辅助局 · 不计战绩')).toHaveCount(0)
})

test('opens each clue header at its matching glossary section and restores focus', async ({
  page,
}) => {
  await startPracticeWithAnswer(page, 'j_mime', 'practice:header-glossary')
  await submitJoker(page, jokerFixture('j_midas_mask'))

  const headerItems = page.locator('.guess-header > *:visible')
  await expect(headerItems).toHaveCount(6)
  await expect(page.locator('.guess-header > span').first()).not.toHaveClass(/clue-info-button/)
  await expect(page.locator('.guess-header .clue-info-button')).toHaveCount(5)
  const headerCenters = await headerItems.evaluateAll((items) =>
    items.map((item) => {
      const box = item.getBoundingClientRect()
      return box.y + box.height / 2
    }),
  )
  expect(Math.max(...headerCenters) - Math.min(...headerCenters)).toBeLessThan(2)

  const fixtures = [
    { key: 'rarity', label: '稀有度', count: 4 },
    { key: 'price', label: '基础价格', count: 2 },
    { key: 'effect', label: '主效果', count: 7 },
    { key: 'timing', label: '触发时机', count: 8 },
    { key: 'dependency', label: '依赖条件', count: 7 },
  ] as const

  for (const fixture of fixtures) {
    const trigger = page.getByRole('button', {
      name: `查看“${fixture.label}”的 ${fixture.count} 类说明`,
    })
    await trigger.click()

    const dialog = page.getByRole('dialog', { name: '线索字典' })
    const heading = dialog.getByRole('heading', { name: fixture.label, exact: true })
    const section = dialog.locator(`section[aria-labelledby="${fixture.key}-glossary-title"]`)
    await expect(dialog).toBeVisible()
    await expect(heading).toBeFocused()
    await expect(section).toHaveAttribute('data-targeted', 'true')
    await expect(section).toBeInViewport()

    await dialog.getByRole('button', { name: '关闭' }).click()
    await expect(trigger).toBeFocused()
  }
})

test('marks a daily game unscored before revealing the collection', async ({ page }) => {
  await page.getByRole('button', { name: '打开小丑图鉴' }).click()

  const dialog = page.getByRole('dialog', { name: '小丑图鉴' })
  await expect(dialog.getByRole('heading', { name: '看图鉴，这一局就不计战绩' })).toBeVisible()
  await dialog.getByRole('button', { name: '继续看图鉴' }).click()

  await expect(dialog.getByText('找到 150 张小丑牌')).toBeVisible()
  const collectionSearch = dialog.getByRole('searchbox', { name: '搜索图鉴' })
  await collectionSearch.fill('Blueprint')
  await expect(dialog.getByRole('article', { name: '蓝图' })).toBeVisible()
  await expect(dialog.getByRole('article')).toHaveCount(1)
  await dialog.getByRole('button', { name: '关闭' }).click()

  await expect(page.getByText('图鉴辅助局 · 不计战绩')).toBeVisible()
  await page.reload()
  await expect(page.getByText('图鉴辅助局 · 不计战绩')).toBeVisible()

  const answer = getDailyAnswer(jokers)
  const search = page.getByRole('combobox', { name: '选择一张小丑牌' })
  await search.fill(answer.name.en)
  await search.press('Enter')
  await search.press('Enter')
  await expect(page.getByText('猜中了！')).toBeVisible()

  await page.getByRole('button', { name: '战绩' }).click()
  const statsDialog = page.getByRole('dialog', { name: '战绩' })
  await expect(statsDialog.getByText('0%', { exact: true })).toBeVisible()
})

test('keeps exact collection details while filtering by clue categories', async ({ page }) => {
  await page.getByRole('button', { name: '无尽牌局' }).click()
  await page.getByRole('button', { name: '打开小丑图鉴' }).click()

  const dialog = page.getByRole('dialog', { name: '小丑图鉴' })
  const filterToggle = dialog.getByRole('button', { name: /筛选/ })
  if (await filterToggle.isVisible()) await filterToggle.click()
  const search = dialog.getByRole('searchbox', { name: '搜索图鉴' })

  await search.fill('Certificate')
  const certificate = dialog.getByRole('article', { name: '证书' })
  await expect(certificate.getByText('生成：蜡封牌', { exact: true })).toBeVisible()
  await expect(certificate.getByText('回合交界：回合开始', { exact: true })).toBeVisible()
  await expect(certificate.getByText('无需额外条件', { exact: true })).toBeVisible()

  await search.fill('')
  await dialog.getByLabel('主效果').selectOption('generate')
  const createPlayingCardCount = jokers.filter((joker) =>
    projectJokerEffectCategories(joker).includes('generate'),
  ).length
  await expect(
    dialog.getByText(`找到 ${createPlayingCardCount} 张小丑牌`, { exact: true }),
  ).toBeVisible()
  await expect(certificate).toBeVisible()

  await dialog.getByLabel('主效果').selectOption('')
  await dialog.getByLabel('触发时机').selectOption('round_boundary')
  const roundBoundaryCount = jokers.filter((joker) =>
    projectJokerTimingFamilies(joker).includes('round_boundary'),
  ).length
  await expect(
    dialog.getByText(`找到 ${roundBoundaryCount} 张小丑牌`, { exact: true }),
  ).toBeVisible()
  await expect(certificate.getByText('回合交界：回合开始', { exact: true })).toBeVisible()

  await dialog.getByLabel('触发时机').selectOption('')
  await dialog.getByLabel('依赖条件').selectOption('hand')
  const playedCardsCount = jokers.filter((joker) =>
    projectJokerDependencies(joker).some((dependency) => dependency.family === 'hand'),
  ).length
  await expect(dialog.getByText(`找到 ${playedCardsCount} 张小丑牌`, { exact: true })).toBeVisible()
  await search.fill('Photograph')
  const photograph = dialog.getByRole('article', { name: '照片' })
  await expect(
    photograph.getByText('单牌／牌组：人头牌；出牌／牌型：首张计分牌', { exact: true }),
  ).toBeVisible()
})

test('keeps collection criteria for the page session and clears them in one action', async ({
  page,
}) => {
  await page.getByRole('button', { name: '无尽牌局' }).click()
  await page.getByRole('button', { name: '打开小丑图鉴' }).click()

  let dialog = page.getByRole('dialog', { name: '小丑图鉴' })
  const search = dialog.getByRole('searchbox', { name: '搜索图鉴' })
  await search.fill('Blueprint')
  const filterToggle = dialog.getByRole('button', { name: /筛选/ })
  if (await filterToggle.isVisible()) await filterToggle.click()
  await dialog.getByLabel('稀有度').selectOption('rare')
  await expect(dialog.getByRole('article', { name: '蓝图' })).toBeVisible()
  await expect(dialog.getByRole('article')).toHaveCount(1)
  await dialog.getByRole('button', { name: '关闭' }).click()

  await page.getByRole('button', { name: '打开小丑图鉴' }).click()
  dialog = page.getByRole('dialog', { name: '小丑图鉴' })
  await expect(dialog.getByRole('searchbox', { name: '搜索图鉴' })).toHaveValue('Blueprint')
  await expect(dialog.getByLabel('稀有度')).toHaveValue('rare')
  await expect(dialog.getByRole('article')).toHaveCount(1)

  await dialog.getByRole('button', { name: '清空' }).click()
  await expect(dialog.getByRole('searchbox', { name: '搜索图鉴' })).toHaveValue('')
  await expect(dialog.getByLabel('稀有度')).toHaveValue('')
  await expect(dialog.getByRole('searchbox', { name: '搜索图鉴' })).toBeFocused()
  await expect(dialog.getByText('找到 150 张小丑牌')).toBeVisible()
  await expect(dialog.getByRole('button', { name: '清空' })).toHaveCount(0)
})

test('fits the viewport and exposes the how-to dialog', async ({ page }) => {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)

  const helpButton = page.getByRole('button', { name: '打开玩法说明' })
  await helpButton.click()
  const dialog = page.getByRole('dialog', { name: '怎么玩' })
  await expect(dialog).toBeVisible()
  await expect(page.locator('.app-shell')).toHaveAttribute('inert', '')
  await expect(dialog.getByText('完全吻合', { exact: true })).toBeVisible()
  const closeButton = dialog.getByRole('button', { name: '关闭' })
  await expect(closeButton).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(closeButton).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '怎么玩' })).toBeHidden()
  await expect(page.locator('.app-shell')).not.toHaveAttribute('inert', '')
  await expect(helpButton).toBeFocused()

  await expect(page.getByRole('link', { name: 'GitHub 源码' })).toHaveAttribute(
    'href',
    'https://github.com/x6ncraft/balatrue',
  )
  await expect(page.getByRole('link', { name: '@x6ncraft', exact: true })).toHaveAttribute(
    'href',
    'https://x.com/x6ncraft',
  )
  await expect(page.getByRole('link', { name: 'X', exact: true })).toHaveAttribute(
    'href',
    'https://x.com/x6ncraft',
  )
  await expect(page.getByRole('link', { name: 'B 站' })).toHaveAttribute(
    'href',
    'https://space.bilibili.com/2056733',
  )
  await expect(page.getByRole('link', { name: '资料来源' })).toHaveAttribute(
    'href',
    'https://balatrowiki.org/',
  )
  await expect(
    page.getByText(`Balatrue v${packageManifest.version} · 进度仅保存在本机`, { exact: true }),
  ).toBeVisible()

  const legalDetails = page.locator('.site-footer__legal')
  const legalSummary = page.getByText('权利与隐私', { exact: true })
  await expect(legalDetails).not.toHaveAttribute('open', '')
  await legalSummary.focus()
  await legalSummary.press('Enter')
  await expect(legalDetails).toHaveAttribute('open', '')
  await expect(page.getByText(/本站不用于盈利/)).toBeVisible()
  await expect(page.getByText(/MIT 只覆盖 Balatrue 自有的功能定义/)).toBeVisible()
  await expect(page.getByText(/当前没有账号、统计 SDK/)).toBeVisible()
  await expect(page.getByText(/Wiki 文字许可链仍在核对/)).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
  await legalSummary.press('Space')
  await expect(legalDetails).not.toHaveAttribute('open', '')
  await legalSummary.press('Enter')

  await page.getByRole('button', { name: '选择界面语言' }).click()
  await expect(page.getByText('Rights & privacy', { exact: true })).toBeVisible()
  await expect(page.getByText(/The site is not operated for profit/)).toBeVisible()
  await expect(
    page.getByText(`Balatrue v${packageManifest.version} · Progress saved locally`, {
      exact: true,
    }),
  ).toBeVisible()
})

test('reports storage failures when starting Endless', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage disabled', 'QuotaExceededError')
    }
  })
  await page.reload()

  await page.getByRole('button', { name: '无尽牌局' }).click()
  await expect(page.getByText('无法保存进度，本次牌局仍可继续。')).toBeVisible()
})

test('keeps clue records readable across desktop widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')

  const sixthSense = jokers.find((joker) => joker.name.en === 'Sixth Sense')
  expect(sixthSense).toBeDefined()
  if (!sixthSense) throw new Error('Expected Sixth Sense in the Joker data')

  await page.getByRole('button', { name: '选择界面语言' }).click()
  const search = page.getByRole('combobox', { name: 'Choose a Joker' })
  await search.fill(sixthSense.name.en)
  await page
    .getByRole('option', { name: `${sixthSense.name.en} ${sixthSense.name.zhCN}`, exact: true })
    .click()
  await page.getByRole('button', { name: 'Guess' }).click()

  const guessArticle = page.getByRole('article', { name: sixthSense.name.en })
  const clueCells = guessArticle.locator('.feedback-cell')
  for (const width of [1440, 1100, 1024, 901, 900, 800, 761]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(clueCells).toHaveCount(5)

    const jokerPosition = await guessArticle.locator('.joker-cell').evaluate((element) => ({
      top: (element as HTMLElement).offsetTop,
    }))
    const cellTops = await clueCells.evaluateAll((cells) =>
      cells.map((cell) => (cell as HTMLElement).offsetTop),
    )
    expect(new Set(cellTops).size).toBe(1)
    expect(cellTops[0]).toBe(jokerPosition.top)

    const valueMetrics = await clueCells.locator('.feedback-cell__value').evaluateAll((values) =>
      values.map((value) => ({
        text: value.textContent,
        clientHeight: value.clientHeight,
        scrollHeight: value.scrollHeight,
        display: getComputedStyle(value).display,
        overflow: getComputedStyle(value).overflow,
      })),
    )
    expect(
      valueMetrics.filter((value) => value.scrollHeight > value.clientHeight + 1),
      `clipped clue values at ${width}px`,
    ).toEqual([])
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
  }
})

test('keeps the newest feedback visible on a short phone screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium')
  await page.setViewportSize({ width: 375, height: 667 })

  await startPracticeWithAnswer(page, 'j_certificate', 'practice:375-layout')
  const directionalGuess = jokerFixture('j_photograph')
  await submitJoker(page, directionalGuess)

  const guessArticle = page.getByRole('article', { name: directionalGuess.name.zhCN })
  await expect
    .poll(() =>
      guessArticle.evaluate(
        (element) => element.getBoundingClientRect().bottom <= window.innerHeight + 1,
      ),
    )
    .toBe(true)
  const clueCells = guessArticle.locator('.feedback-cell')
  await expect(clueCells).toHaveCount(5)
  const cellTops = await clueCells.evaluateAll((cells) =>
    cells.map((cell) => (cell as HTMLElement).offsetTop),
  )
  expect(new Set(cellTops).size).toBe(1)
  const jokerTop = await guessArticle
    .locator('.joker-cell')
    .evaluate((element) => (element as HTMLElement).offsetTop)
  expect(cellTops[0]).toBe(jokerTop)
  const clippedValues = await clueCells
    .locator('.feedback-cell__value')
    .evaluateAll(
      (values) => values.filter((value) => value.scrollHeight > value.clientHeight + 1).length,
    )
  expect(clippedValues).toBe(0)
  await expect(clueCells.nth(4).locator('.feedback-cell__value')).toHaveText(
    '单牌／牌组 · 出牌／牌型',
  )
  const directionalReadout = guessArticle.locator('.feedback-cell__readout--directional').first()
  await expect(directionalReadout).toBeVisible()
  await expect
    .poll(() =>
      directionalReadout.evaluate((element) => ({
        display: getComputedStyle(element).display,
        whiteSpace: getComputedStyle(element).whiteSpace,
      })),
    )
    .toEqual({ display: 'flex', whiteSpace: 'nowrap' })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
})

test('uses full-screen mobile reference panels with collapsible filters', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium')
  await page.setViewportSize({ width: 375, height: 667 })

  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content')
  expect(viewport).toContain('width=device-width')
  expect(viewport).toContain('initial-scale=1.0')
  expect(viewport).not.toContain('user-scalable=no')
  expect(viewport).not.toContain('maximum-scale=1')

  const gameSearch = page.getByRole('combobox', { name: '选择一张小丑牌' })
  await expect
    .poll(() =>
      gameSearch.evaluate((element) => ({
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        touchAction: getComputedStyle(element).touchAction,
      })),
    )
    .toEqual({ fontSize: 16, touchAction: 'manipulation' })

  await expect
    .poll(() =>
      page.evaluate(() => ({
        viewportTouchAction: getComputedStyle(document.documentElement).touchAction,
        fitsWidth: document.documentElement.scrollWidth <= window.innerWidth,
      })),
    )
    .toEqual({ viewportTouchAction: 'manipulation', fitsWidth: true })

  await page.getByRole('button', { name: '打开小丑图鉴' }).click()
  const collection = page.getByRole('dialog', { name: '小丑图鉴' })
  await collection.getByRole('button', { name: '继续看图鉴' }).click()
  const collectionSearch = collection.getByRole('searchbox', { name: '搜索图鉴' })
  await expect(collectionSearch).toBeFocused()
  await expect(collection.getByRole('button', { name: '筛选' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  await page.keyboard.press('Tab')
  await expect(collection.getByRole('button', { name: '筛选' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(collection.getByRole('button', { name: '关闭' })).toBeFocused()
  await expect(page.locator('.app-shell')).toHaveAttribute('inert', '')
  await collection.getByRole('button', { name: '筛选' }).click()
  const rarityFilter = collection.getByRole('combobox', { name: '稀有度' })
  await expect(rarityFilter).toBeVisible()
  await expect
    .poll(() =>
      collection
        .locator('input, select')
        .evaluateAll((controls) =>
          controls.map((control) => Number.parseFloat(getComputedStyle(control).fontSize)),
        ),
    )
    .toEqual([16, 16, 16, 16, 16])

  const collectionBox = await collection.boundingBox()
  expect(collectionBox).not.toBeNull()
  expect(Math.round(collectionBox?.width ?? 0)).toBe(375)
  expect(Math.round(collectionBox?.height ?? 0)).toBe(667)

  await collection.getByRole('button', { name: '关闭' }).click()
  await expect(page.locator('.app-shell')).not.toHaveAttribute('inert', '')
  await page.getByRole('button', { name: '线索字典' }).click()
  const glossary = page.getByRole('dialog', { name: '线索字典' })
  await expect(page.locator('.app-shell')).toHaveAttribute('inert', '')
  const glossaryBox = await glossary.boundingBox()
  expect(glossaryBox).not.toBeNull()
  expect(Math.round(glossaryBox?.width ?? 0)).toBe(375)
  expect(Math.round(glossaryBox?.height ?? 0)).toBe(667)
  await glossary.getByRole('button', { name: '关闭' }).click()
  await expect(page.locator('.app-shell')).not.toHaveAttribute('inert', '')
})

test('keeps touch form controls zoom-safe in phone landscape', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium')
  await page.setViewportSize({ width: 844, height: 390 })

  const gameSearch = page.getByRole('combobox', { name: '选择一张小丑牌' })
  await expect
    .poll(() =>
      gameSearch.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    )
    .toBeGreaterThanOrEqual(16)

  await gameSearch.fill('a')
  const suggestions = page.getByRole('listbox')
  await expect(suggestions).toBeVisible()
  const suggestionsBox = await suggestions.boundingBox()
  expect(suggestionsBox).not.toBeNull()
  expect((suggestionsBox?.y ?? 0) + (suggestionsBox?.height ?? 0)).toBeLessThanOrEqual(390)
  const options = suggestions.getByRole('option')
  expect(await options.count()).toBeGreaterThan(1)
  await options.last().scrollIntoViewIfNeeded()
  await expect(options.last()).toBeVisible()
  await gameSearch.fill('')

  await page.setViewportSize({ width: 568, height: 320 })
  await page.getByRole('button', { name: '打开小丑图鉴' }).click()
  let collection = page.getByRole('dialog', { name: '小丑图鉴' })
  const compactGate = collection.locator('.collection-gate')
  const compactMark = collection.locator('.collection-gate__mark')
  const compactCancel = collection.getByRole('button', { name: '这局先不看' })
  const [compactGateBox, compactMarkBox] = await Promise.all([
    compactGate.boundingBox(),
    compactMark.boundingBox(),
  ])
  expect(compactGateBox).not.toBeNull()
  expect(compactMarkBox).not.toBeNull()
  expect(compactMarkBox?.y ?? 0).toBeGreaterThanOrEqual(compactGateBox?.y ?? 0)
  await compactCancel.scrollIntoViewIfNeeded()
  const compactCancelBox = await compactCancel.boundingBox()
  expect(compactCancelBox).not.toBeNull()
  expect((compactCancelBox?.y ?? 0) + (compactCancelBox?.height ?? 0)).toBeLessThanOrEqual(320)
  await compactCancel.click()

  await page.setViewportSize({ width: 844, height: 390 })
  await page.getByRole('button', { name: '打开小丑图鉴' }).click()
  collection = page.getByRole('dialog', { name: '小丑图鉴' })
  const continueButton = collection.getByRole('button', { name: '继续看图鉴' })
  const cancelButton = collection.getByRole('button', { name: '这局先不看' })
  const [collectionBox, continueBox, cancelBox] = await Promise.all([
    collection.boundingBox(),
    continueButton.boundingBox(),
    cancelButton.boundingBox(),
  ])
  expect(collectionBox).not.toBeNull()
  expect(continueBox).not.toBeNull()
  expect(cancelBox).not.toBeNull()
  expect((continueBox?.y ?? 0) + (continueBox?.height ?? 0)).toBeLessThanOrEqual(
    (collectionBox?.y ?? 0) + (collectionBox?.height ?? 0),
  )
  expect((cancelBox?.y ?? 0) + (cancelBox?.height ?? 0)).toBeLessThanOrEqual(
    (collectionBox?.y ?? 0) + (collectionBox?.height ?? 0),
  )
  await continueButton.click()
  await expect
    .poll(() =>
      collection
        .locator('input, select')
        .evaluateAll((controls) =>
          controls.map((control) => Number.parseFloat(getComputedStyle(control).fontSize)),
        ),
    )
    .toEqual([16, 16, 16, 16, 16])
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
})

test('keeps the mobile brand clear of the action buttons', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium')

  for (const width of [390, 375, 360, 340, 320]) {
    await page.setViewportSize({ width, height: 568 })
    const [brandBox, actionsBox] = await Promise.all([
      page.locator('.brand').boundingBox(),
      page.locator('.top-actions').boundingBox(),
    ])
    expect(brandBox, `brand box at ${width}px`).not.toBeNull()
    expect(actionsBox, `action box at ${width}px`).not.toBeNull()
    expect((brandBox?.x ?? 0) + (brandBox?.width ?? 0) + 4).toBeLessThanOrEqual(actionsBox?.x ?? 0)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
  }
})

test('keeps the 320px layout readable without zoom or overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium')
  await page.setViewportSize({ width: 320, height: 568 })

  const footerMeta = page.locator('.site-footer__meta')
  await expect(footerMeta).toHaveText(`Balatrue v${packageManifest.version} · 进度仅保存在本机`)
  await page.locator('.language-button').click()
  await expect(footerMeta).toHaveText(
    `Balatrue v${packageManifest.version} · Progress saved locally`,
  )
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
  await page.locator('.language-button').click()

  const search = page.getByRole('combobox', { name: '选择一张小丑牌' })
  await expect
    .poll(() => search.evaluate((input) => Number.parseFloat(getComputedStyle(input).fontSize)))
    .toBe(16)
  expect(await page.evaluate(() => visualViewport?.scale ?? 1)).toBe(1)
  await search.focus()
  expect(await page.evaluate(() => visualViewport?.scale ?? 1)).toBe(1)

  const [brandBox, actionsBox, inputBox, guessBox] = await Promise.all([
    page.locator('.brand').boundingBox(),
    page.locator('.top-actions').boundingBox(),
    search.boundingBox(),
    page.getByRole('button', { name: '先选牌' }).boundingBox(),
  ])
  expect(brandBox).not.toBeNull()
  expect(actionsBox).not.toBeNull()
  expect(inputBox).not.toBeNull()
  expect(guessBox).not.toBeNull()
  const brandCenter = (brandBox?.y ?? 0) + (brandBox?.height ?? 0) / 2
  const actionsCenter = (actionsBox?.y ?? 0) + (actionsBox?.height ?? 0) / 2
  expect(Math.abs(brandCenter - actionsCenter)).toBeLessThan(2)
  expect((brandBox?.x ?? 0) + (brandBox?.width ?? 0) + 4).toBeLessThanOrEqual(actionsBox?.x ?? 0)
  expect(Math.abs((inputBox?.y ?? 0) - (guessBox?.y ?? 0))).toBeLessThan(2)
  await expect(page.getByText('6 次机会')).toBeVisible()
  const quickStart = page.getByRole('region', { name: '随手出一张作为第一猜' })
  const quickCards = quickStart.getByRole('button', { name: /作为第一猜$/ })
  await expect(quickStart).toBeInViewport()
  await expect(quickCards).toHaveCount(5)
  const quickCardBoxes = await quickCards.evaluateAll((cards) =>
    cards.map((card) => {
      const box = card.getBoundingClientRect()
      return { x: box.x, y: box.y, width: box.width, height: box.height }
    }),
  )
  expect(quickCardBoxes.every((box) => Math.abs(box.y - quickCardBoxes[0]!.y) < 2)).toBe(true)
  expect(quickCardBoxes.every((box) => box.width >= 44 && box.height >= 44)).toBe(true)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)

  await startPracticeWithAnswer(page, 'j_certificate', 'practice:320-layout')
  const joker = jokerFixture('j_photograph')
  await submitJoker(page, joker)

  const row = page.locator('.guess-row').first()
  await row.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations({ subtree: true }).map((animation) => animation.finished),
    )
  })
  const [rowBox, jokerCellBox, feedbackBoxes] = await Promise.all([
    row.boundingBox(),
    row.locator('.joker-cell').boundingBox(),
    row.locator('.feedback-cell').evaluateAll((cells) =>
      cells.map((cell) => {
        const box = cell.getBoundingClientRect()
        return { x: box.x, y: box.y, width: box.width, height: box.height }
      }),
    ),
  ])
  expect(rowBox).not.toBeNull()
  expect(jokerCellBox).not.toBeNull()
  expect(feedbackBoxes).toHaveLength(5)
  expect(jokerCellBox?.width ?? 0).toBeGreaterThanOrEqual(42)
  expect(feedbackBoxes.every((box) => Math.abs(box.y - (jokerCellBox?.y ?? 0)) < 2)).toBe(true)
  expect(feedbackBoxes.every((box) => Math.abs(box.y - feedbackBoxes[0]!.y) < 2)).toBe(true)
  expect(feedbackBoxes.every((box) => box.width >= 44)).toBe(true)
  const clippedValues = await row
    .locator('.feedback-cell__value')
    .evaluateAll(
      (values) => values.filter((value) => value.scrollHeight > value.clientHeight + 1).length,
    )
  expect(clippedValues).toBe(0)
  const escapedCellContent = await row
    .locator('.feedback-cell__readout, .feedback-cell__detail')
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const cell = element.closest('.feedback-cell')
        if (!cell) return ['missing-cell']
        const contentBox = element.getBoundingClientRect()
        const cellBox = cell.getBoundingClientRect()
        const isContained =
          contentBox.left >= cellBox.left - 1 &&
          contentBox.right <= cellBox.right + 1 &&
          contentBox.top >= cellBox.top - 1 &&
          contentBox.bottom <= cellBox.bottom + 1
        return isContained ? [] : [element.textContent ?? '']
      }),
    )
  expect(escapedCellContent).toEqual([])
  await expect(row.locator('.feedback-cell').nth(4).locator('.feedback-cell__value')).toHaveText(
    '单牌／牌组 · 出牌／牌型',
  )

  const headerButtons = page.locator('.guess-header .clue-info-button')
  await expect(headerButtons).toHaveCount(5)
  await expect(headerButtons.nth(1)).toHaveAttribute('aria-label', /基础价格/)
  await expect(headerButtons.nth(1).locator('.clue-info-button__label--compact')).toHaveText('价格')
  await expect(headerButtons.nth(1).locator('.clue-info-button__label--compact')).toBeVisible()
  const [headerBoxes, headerIconSizes] = await Promise.all([
    headerButtons.evaluateAll((buttons) =>
      buttons.map((button) => {
        const box = button.getBoundingClientRect()
        return { y: box.y, width: box.width, height: box.height }
      }),
    ),
    headerButtons.locator('svg').evaluateAll((icons) =>
      icons.map((icon) => {
        const box = icon.getBoundingClientRect()
        return { width: box.width, height: box.height }
      }),
    ),
  ])
  expect(headerBoxes.every((box) => Math.abs(box.y - headerBoxes[0]!.y) < 2)).toBe(true)
  expect(headerBoxes.every((box) => box.width >= 44 && box.height >= 38)).toBe(true)
  expect(headerIconSizes.every((box) => box.width >= 12 && box.height >= 12)).toBe(true)

  await page.getByRole('button', { name: '选择界面语言：EN' }).click()
  await expect(headerButtons.nth(1)).toHaveAttribute('aria-label', /Base price/)
  await expect(headerButtons.nth(1).locator('.clue-info-button__label--compact')).toHaveText(
    'Price',
  )
  await page.locator('.language-button').click()

  await submitJoker(page, jokerFixture('j_marble'))
  const yellowEffectDetail = page
    .getByRole('article', { name: '大理石小丑' })
    .locator('.feedback-cell')
    .nth(2)
    .locator('.feedback-cell__detail')
  await expect(yellowEffectDetail).toHaveText('石头牌')
  await expect
    .poll(() =>
      yellowEffectDetail.evaluate((detail) => Number.parseFloat(getComputedStyle(detail).fontSize)),
    )
    .toBeGreaterThanOrEqual(9)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)

  await startPracticeWithAnswer(page, 'j_lucky_cat', 'practice:320-long-yellow-detail')
  await submitJoker(page, jokerFixture('j_steel_joker'))
  await page.getByRole('button', { name: '选择界面语言：EN' }).click()
  const steelConditionDetail = page
    .getByRole('article', { name: 'Steel Joker' })
    .locator('.feedback-cell')
    .nth(4)
    .locator('.feedback-cell__detail')
  await expect(steelConditionDetail).toHaveText('Steel Cards in your full deck')
  expect(
    await steelConditionDetail.evaluate((detail) => detail.scrollHeight > detail.clientHeight + 1),
  ).toBe(false)
})

test('keeps the longest yellow condition readable on narrow screens', async ({
  page,
}, testInfo) => {
  const widths = testInfo.project.name === 'mobile-chromium' ? [375, 320] : [900, 844, 761]

  await startPracticeWithAnswer(page, 'j_superposition', 'practice:long-yellow-condition')
  await submitJoker(page, jokerFixture('j_sixth_sense'))
  const conditionDetail = page
    .getByRole('article', { name: '第六感' })
    .locator('.feedback-cell')
    .nth(4)
    .locator('.feedback-cell__detail')
  await expect(conditionDetail).toHaveText('6、首手单张、空消耗牌栏')

  for (const width of widths) {
    await page.setViewportSize({ width, height: 568 })
    await expect(conditionDetail).toBeVisible()
    expect(
      await conditionDetail.evaluate((detail) => detail.scrollHeight > detail.clientHeight + 1),
    ).toBe(false)
    const rowBox = await page.getByRole('article', { name: '第六感' }).boundingBox()
    expect(rowBox?.height ?? Number.POSITIVE_INFINITY).toBeLessThan(width === 375 ? 200 : 240)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
  }

  await page.getByRole('button', { name: '选择界面语言：EN' }).click()
  const englishConditionDetail = page
    .getByRole('article', { name: 'Sixth Sense' })
    .locator('.feedback-cell')
    .nth(4)
    .locator('.feedback-cell__detail')
  await expect(englishConditionDetail).toHaveText(
    '6, First hand is exactly 1 card, Open consumable slot',
  )

  for (const width of widths) {
    await page.setViewportSize({ width, height: 568 })
    await expect(englishConditionDetail).toBeVisible()
    expect(
      await englishConditionDetail.evaluate(
        (detail) => detail.scrollHeight > detail.clientHeight + 1,
      ),
    ).toBe(false)
    const rowBox = await page.getByRole('article', { name: 'Sixth Sense' }).boundingBox()
    expect(rowBox?.height ?? Number.POSITIVE_INFINITY).toBeLessThan(width === 375 ? 200 : 240)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
  }
})

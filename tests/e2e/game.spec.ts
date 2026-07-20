import { expect, test, type Page } from '@playwright/test'

import { JOKER_DATA_META, jokers } from '../../src/data'
import {
  createDailyGame,
  GAME_CLUE_MODEL_VERSION,
  gameStorageKey,
  getDailyAnswer,
  serializeGameState,
} from '../../src/game'
import { buildJokerSearchIndex, searchJokers } from '../../src/search'

const browserErrors = new WeakMap<Page, string[]>()

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
  await expect(page.getByText('选一张小丑牌出牌，根据五项线索继续缩小范围。')).toBeVisible()
  await expect(page.getByText('6 次机会')).toBeVisible()

  const search = page.getByRole('combobox', { name: '选择一张小丑牌' })
  await page.getByRole('button', { name: '猜猜看' }).click()
  await expect(page.getByText('请先选择一张候选牌。')).toBeVisible()

  await search.fill('joker')
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
  await search.press('Enter')

  await expect(page.getByRole('article', { name: '蓝图' })).toBeVisible()
  await expect(page.getByText('剩余：5')).toBeVisible()
  await expect(search).toBeFocused()
  await expect(search).toHaveValue('')

  await search.fill('lantu')
  const repeated = page.getByRole('option').filter({ hasText: '蓝图' })
  await expect(repeated).toHaveAttribute('aria-disabled', 'true')
})

test('migrates the previous clue model without losing the active daily game', async ({ page }) => {
  const oldState = createDailyGame(jokers)
  const oldKey = gameStorageKey(JOKER_DATA_META.gameVersion, 8, 'daily', oldState.puzzleKey, 2)
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
  await page.getByRole('button', { name: '猜猜看' }).click()
  await expect(page.getByText('请先选择一张候选牌。')).toBeVisible()
  await page.getByRole('button', { name: '选择界面语言：EN' }).click()
  await expect(page.getByRole('region', { name: "Guess today's Joker" })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Choose a Joker' })).toBeVisible()
  await expect(page.getByText('Choose a Joker from the suggestions first.')).toBeVisible()

  await page.getByRole('button', { name: 'Endless' }).click()
  await expect(page.getByRole('region', { name: 'Endless' })).toBeVisible()
  await expect(page.getByText('6 guesses')).toBeVisible()
})

test('explains every clue family without affecting the score', async ({ page }) => {
  await page.getByRole('button', { name: '线索字典' }).click()

  const dialog = page.getByRole('dialog', { name: '线索字典' })
  await expect(dialog).toBeVisible()
  for (const heading of ['稀有度', '基础价格', '主效果', '触发时机', '依赖条件']) {
    await expect(dialog.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }
  await expect(dialog.getByText('普通', { exact: true })).toBeVisible()
  for (const timing of [
    '常驻',
    '出牌时',
    '留在手牌',
    '弃牌时',
    '使用消耗牌时',
    '加入牌组时',
    '卡牌摧毁时',
    '盲注阶段',
    '商店/出售',
    '回合开始',
    '回合结束',
  ]) {
    await expect(dialog.getByText(timing, { exact: true })).toBeVisible()
  }
  await expect(dialog.getByText('同花顺', { exact: true })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByText('图鉴辅助局 · 不计战绩')).toHaveCount(0)
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
      bottom: (element as HTMLElement).offsetTop + (element as HTMLElement).offsetHeight,
    }))
    const cellTops = await clueCells.evaluateAll((cells) =>
      cells.map((cell) => (cell as HTMLElement).offsetTop),
    )
    expect(new Set(cellTops).size).toBe(1)
    if (width <= 900) expect(cellTops[0] ?? 0).toBeGreaterThanOrEqual(jokerPosition.bottom)
    else expect(cellTops[0]).toBe(jokerPosition.top)

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

  const answer = getDailyAnswer(jokers)
  const directionalGuess = jokers.find(
    (joker) =>
      joker.id !== answer.id &&
      (joker.official.rarity !== answer.official.rarity ||
        (joker.classification.acquisition.kind === 'shop' &&
          answer.classification.acquisition.kind === 'shop' &&
          joker.official.cost !== answer.official.cost)),
  )
  expect(directionalGuess).toBeDefined()
  if (!directionalGuess) throw new Error('Expected a Joker with a directional clue')

  const search = page.getByRole('combobox', { name: '选择一张小丑牌' })
  await search.fill(directionalGuess.name.en)
  await page
    .getByRole('option', {
      name: `${directionalGuess.name.zhCN} ${directionalGuess.name.en}`,
      exact: true,
    })
    .click()
  await page.getByRole('button', { name: '猜猜看' }).click()

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

test('keeps the 320px starting view compact and aligned', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium')
  await page.setViewportSize({ width: 320, height: 568 })

  const [brandBox, actionsBox, inputBox, guessBox] = await Promise.all([
    page.locator('.brand').boundingBox(),
    page.locator('.top-actions').boundingBox(),
    page.getByRole('combobox', { name: '选择一张小丑牌' }).boundingBox(),
    page.getByRole('button', { name: '猜猜看' }).boundingBox(),
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
  await expect(page.locator('.empty-board')).toBeInViewport()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
})

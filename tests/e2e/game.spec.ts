import { expect, test, type Page } from '@playwright/test'

import { jokers } from '../../src/data'
import { getDailyAnswer } from '../../src/game'

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
  await expect(page.getByRole('heading', { name: '猜猜今天是哪张小丑牌' })).toBeVisible()
  await expect(page.getByText('6 次机会')).toBeVisible()

  const search = page.getByRole('combobox', { name: '选择一张小丑牌' })
  await page.getByRole('button', { name: '猜一下' }).click()
  await expect(page.getByText('请先选择一张候选牌。')).toBeVisible()

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
    await page.getByRole('button', { name: '猜一下' }).click()
  }

  await expect(page.getByText('差一点')).toBeVisible()
  await expect(page.getByRole('heading', { name: answer.name.zhCN })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(6)
})

test('switches the full interface to English and opens practice mode', async ({ page }) => {
  await page.getByRole('button', { name: '猜一下' }).click()
  await expect(page.getByText('请先选择一张候选牌。')).toBeVisible()
  await page.getByRole('button', { name: '选择界面语言' }).click()
  await expect(page.getByRole('heading', { name: "Guess today's Joker" })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Choose a Joker' })).toBeVisible()
  await expect(page.getByText('Choose a Joker from the suggestions first.')).toBeVisible()

  await page.getByRole('button', { name: 'Endless' }).click()
  await expect(page.getByRole('heading', { name: 'Endless' })).toBeVisible()
  await expect(page.getByText('6 guesses')).toBeVisible()
})

test('explains every clue family without affecting the score', async ({ page }) => {
  await page.getByRole('button', { name: '线索字典' }).click()

  const dialog = page.getByRole('dialog', { name: '线索字典' })
  await expect(dialog).toBeVisible()
  for (const heading of ['稀有度', '基础价格', '主效果', '怎么触发', '依赖什么']) {
    await expect(dialog.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }
  await expect(dialog.getByText('普通', { exact: true })).toBeVisible()
  await expect(dialog.getByText('牌局中成长', { exact: true })).toBeVisible()
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
  await page.getByRole('button', { name: '猜一下' }).click()

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
  await expect(collection.getByRole('combobox', { name: '稀有度' })).toBeVisible()

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

test('keeps the 320px starting view compact and aligned', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium')
  await page.setViewportSize({ width: 320, height: 568 })

  const [brandBox, actionsBox, inputBox, guessBox] = await Promise.all([
    page.locator('.brand').boundingBox(),
    page.locator('.top-actions').boundingBox(),
    page.getByRole('combobox', { name: '选择一张小丑牌' }).boundingBox(),
    page.getByRole('button', { name: '猜一下' }).boundingBox(),
  ])
  expect(brandBox).not.toBeNull()
  expect(actionsBox).not.toBeNull()
  expect(inputBox).not.toBeNull()
  expect(guessBox).not.toBeNull()
  const brandCenter = (brandBox?.y ?? 0) + (brandBox?.height ?? 0) / 2
  const actionsCenter = (actionsBox?.y ?? 0) + (actionsBox?.height ?? 0) / 2
  expect(Math.abs(brandCenter - actionsCenter)).toBeLessThan(2)
  expect(Math.abs((inputBox?.y ?? 0) - (guessBox?.y ?? 0))).toBeLessThan(2)
  await expect(page.getByText('6 次机会')).toBeVisible()
  await expect(page.locator('.empty-board')).toBeInViewport()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
})

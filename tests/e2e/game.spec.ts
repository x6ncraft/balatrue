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
  await expect(page.getByText('剩余：6')).toBeVisible()

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
  await page.getByRole('button', { name: '猜一下' }).click()

  await expect(page.getByRole('article', { name: '蓝图' })).toBeVisible()
  await expect(page.getByText('剩余：5')).toBeVisible()

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

  await page.getByRole('button', { name: '分享结果' }).click()
  await expect(page.getByRole('button', { name: '已复制' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: answer.name.zhCN })).toBeVisible()
  await expect(page.getByText('猜中了！')).toBeVisible()

  const statsButton = page.getByRole('button', { name: '战绩' })
  await statsButton.click()
  const statsDialog = page.getByRole('dialog', { name: '战绩' })
  await expect(statsDialog.getByText('100%')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(statsDialog).toBeHidden()
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
  await page.getByRole('button', { name: '选择界面语言' }).click()
  await expect(page.getByRole('heading', { name: "Guess today's Joker" })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Choose a Joker' })).toBeVisible()

  await page.getByRole('button', { name: 'Endless' }).click()
  await expect(page.getByRole('heading', { name: 'Endless' })).toBeVisible()
  await expect(page.getByText('Remaining: 6')).toBeVisible()
})

test('explains every clue family without affecting the score', async ({ page }) => {
  await page.getByRole('button', { name: '查看线索字典' }).click()

  const dialog = page.getByRole('dialog', { name: '线索字典' })
  await expect(dialog).toBeVisible()
  for (const heading of ['稀有度', '基础价格', '主效果', '生效时点', '依赖条件']) {
    await expect(dialog.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }
  await expect(dialog.getByText('普通', { exact: true })).toBeVisible()
  await expect(dialog.getByText('多个时点', { exact: true })).toBeVisible()
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
  await expect(dialog.getByText('完全吻合', { exact: true })).toBeVisible()
  const closeButton = dialog.getByRole('button', { name: '关闭' })
  await expect(closeButton).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(closeButton).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '怎么玩' })).toBeHidden()
  await expect(helpButton).toBeFocused()
})

test('scrolls the newest feedback into view on a short phone screen', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium')
  await page.setViewportSize({ width: 375, height: 667 })

  const search = page.getByRole('combobox', { name: '选择一张小丑牌' })
  await search.fill('Flower Pot')
  await page.getByRole('option', { name: '花盆 Flower Pot' }).click()
  await page.getByRole('button', { name: '猜一下' }).click()

  await expect
    .poll(() =>
      page
        .getByRole('article', { name: '花盆' })
        .evaluate((element) => element.getBoundingClientRect().bottom <= window.innerHeight + 1),
    )
    .toBe(true)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

  const clueCells = page.getByRole('article', { name: '花盆' }).locator('.feedback-cell')
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
  await page.getByRole('button', { name: '查看线索字典' }).click()
  const glossary = page.getByRole('dialog', { name: '线索字典' })
  await expect(page.locator('.app-shell')).toHaveAttribute('inert', '')
  const glossaryBox = await glossary.boundingBox()
  expect(glossaryBox).not.toBeNull()
  expect(Math.round(glossaryBox?.width ?? 0)).toBe(375)
  expect(Math.round(glossaryBox?.height ?? 0)).toBe(667)
  await glossary.getByRole('button', { name: '关闭' }).click()
  await expect(page.locator('.app-shell')).not.toHaveAttribute('inert', '')
})

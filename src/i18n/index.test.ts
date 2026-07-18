import { describe, expect, it } from 'vitest'

import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  localeName,
  normalizeLocale,
  parseLocalePreference,
  resolveLocale,
  serializeLocalePreference,
  t,
} from './index'

describe('translations', () => {
  it('uses natural Chinese copy as the default language', () => {
    expect(DEFAULT_LOCALE).toBe('zh-CN')
    expect(t('zh-CN', 'brand.tagline')).toBe('猜猜今天是哪张小丑牌')
    expect(t('zh-CN', 'search.placeholder')).toBe('输入中文、英文或拼音')
  })

  it('returns the English copy for the same message key', () => {
    expect(t('en', 'brand.tagline')).toBe("Guess today's Joker")
    expect(t('en', 'search.placeholder')).toBe('Search by name or pinyin')
  })

  it('interpolates named values without hiding missing parameters', () => {
    expect(t('zh-CN', 'game.progress', { current: 3, total: 8 })).toBe('第 3 / 8 次')
    expect(t('en', 'result.winMessage', { count: 4 })).toBe('You found the answer on guess 4.')
    expect(t('en', 'result.lossMessage')).toBe("Today's answer was {name}.")
  })
})

describe('locale preference', () => {
  it('normalizes supported browser language tags', () => {
    expect(normalizeLocale(' ZH_hans_CN ')).toBe('zh-CN')
    expect(normalizeLocale('zh-TW')).toBe('zh-CN')
    expect(normalizeLocale('en-GB')).toBe('en')
    expect(normalizeLocale('fr-FR')).toBeNull()
    expect(normalizeLocale(null)).toBeNull()
  })

  it('prefers a valid stored choice over browser languages', () => {
    expect(resolveLocale({ stored: 'en', preferredLanguages: ['zh-CN'] })).toBe('en')
    expect(resolveLocale({ stored: 'broken', preferredLanguages: ['fr-FR', 'en-US'] })).toBe('en')
    expect(resolveLocale({ preferredLanguages: ['fr-FR'] })).toBe('zh-CN')
  })

  it('serializes and parses the local-storage value without accessing browser globals', () => {
    expect(LOCALE_STORAGE_KEY).toBe('balatrue:locale')
    expect(serializeLocalePreference('zh-CN')).toBe('zh-CN')
    expect(parseLocalePreference(serializeLocalePreference('en'))).toBe('en')
    expect(parseLocalePreference('{"locale":"en"}')).toBeNull()
  })

  it('provides language labels in either interface language', () => {
    expect(localeName('zh-CN', 'zh-CN')).toBe('简体中文')
    expect(localeName('en', 'zh-CN')).toBe('English')
    expect(localeName('zh-CN', 'en')).toBe('简体中文')
  })
})

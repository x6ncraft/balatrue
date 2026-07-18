import { messages, type MessageKey } from './messages'

export { messages, type MessageKey } from './messages'

export const SUPPORTED_LOCALES = ['zh-CN', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'zh-CN'
export const LOCALE_STORAGE_KEY = 'balatrue:locale'

export type MessageParams = Readonly<Record<string, string | number>>

export interface LocaleResolutionInput {
  stored?: unknown
  preferredLanguages?: readonly string[]
}

export function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase().replaceAll('_', '-')

  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en'
  }

  if (normalized === 'zh' || normalized.startsWith('zh-')) {
    return 'zh-CN'
  }

  return null
}

export function parseLocalePreference(value: unknown): Locale | null {
  return normalizeLocale(value)
}

export function serializeLocalePreference(locale: Locale): string {
  return locale
}

export function resolveLocale({
  stored,
  preferredLanguages = [],
}: LocaleResolutionInput = {}): Locale {
  const storedLocale = parseLocalePreference(stored)
  if (storedLocale) {
    return storedLocale
  }

  for (const language of preferredLanguages) {
    const locale = normalizeLocale(language)
    if (locale) {
      return locale
    }
  }

  return DEFAULT_LOCALE
}

export function t(locale: Locale, key: MessageKey, params: MessageParams = {}): string {
  const template: string = messages[locale][key]

  return template.replace(/\{([a-zA-Z][\w]*)\}/g, (token, parameter: string) => {
    const value = params[parameter]
    return value === undefined ? token : String(value)
  })
}

export function localeName(locale: Locale, displayLocale: Locale = locale): string {
  return t(displayLocale, locale === 'zh-CN' ? 'locale.zhCN' : 'locale.en')
}

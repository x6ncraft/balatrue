import type { Joker } from '../data/types'
import type { Locale } from '../i18n'
import { JOKER_SEARCH_ALIASES } from './joker-search.generated'
import { normalizeSearchText } from './normalize'

export { normalizeSearchText } from './normalize'

export type JokerSearchField = 'zhCN' | 'en' | 'pinyin' | 'initials'
export type JokerSearchMatchKind = 'exact' | 'prefix' | 'contiguous'

interface JokerSearchValue {
  readonly field: JokerSearchField
  readonly normalized: string
}

interface JokerSearchEntry {
  readonly joker: Joker
  readonly sourceIndex: number
  readonly values: readonly JokerSearchValue[]
}

export interface JokerSearchIndex {
  readonly entries: readonly JokerSearchEntry[]
}

export type JokerSearchAliases = Readonly<
  Record<string, readonly [pinyin: string, initials: string]>
>

export interface JokerSearchOptions {
  readonly locale?: Locale
  readonly guessedIds?: Iterable<string>
  readonly limit?: number
  readonly includeDisabled?: boolean
}

export interface JokerSearchOption {
  readonly id: string
  readonly joker: Joker
  readonly primaryName: string
  readonly secondaryName: string
  readonly disabled: boolean
  readonly matchKind: JokerSearchMatchKind
  readonly matchedField: JokerSearchField
}

export interface JokerCombobox {
  readonly getOptions: (query: string) => readonly JokerSearchOption[]
  readonly getById: (id: string) => Joker | undefined
  readonly canSelect: (id: string) => boolean
}

interface RankedMatch {
  readonly kind: JokerSearchMatchKind
  readonly kindRank: number
  readonly field: JokerSearchField
  readonly fieldRank: number
  readonly position: number
}

interface RankedEntry {
  readonly entry: JokerSearchEntry
  readonly match: RankedMatch
}

export function buildJokerSearchIndex(
  jokers: readonly Joker[],
  aliasesById: JokerSearchAliases = JOKER_SEARCH_ALIASES,
): JokerSearchIndex {
  return {
    entries: jokers.map((joker, sourceIndex) => {
      const aliases = aliasesById[joker.id]
      if (!aliases) throw new Error(`Missing search aliases for ${joker.id}`)

      return {
        joker,
        sourceIndex,
        values: [
          { field: 'zhCN', normalized: normalizeSearchText(joker.name.zhCN) },
          { field: 'en', normalized: normalizeSearchText(joker.name.en) },
          { field: 'pinyin', normalized: normalizeSearchText(aliases[0]) },
          { field: 'initials', normalized: normalizeSearchText(aliases[1]) },
        ],
      }
    }),
  }
}

function matchValue(
  candidate: string,
  query: string,
): Omit<RankedMatch, 'field' | 'fieldRank'> | null {
  if (!candidate) {
    return null
  }

  if (candidate === query) {
    return { kind: 'exact', kindRank: 0, position: 0 }
  }

  if (candidate.startsWith(query)) {
    return { kind: 'prefix', kindRank: 1, position: 0 }
  }

  const position = candidate.indexOf(query)
  if (position >= 0) {
    return { kind: 'contiguous', kindRank: 2, position }
  }

  return null
}

function getFieldRank(field: JokerSearchField, locale: Locale): number {
  if (field === (locale === 'zh-CN' ? 'zhCN' : 'en')) {
    return 0
  }

  if (field === (locale === 'zh-CN' ? 'en' : 'zhCN')) {
    return 1
  }

  return field === 'pinyin' ? 2 : 3
}

function compareMatch(left: RankedMatch, right: RankedMatch): number {
  return (
    left.kindRank - right.kindRank ||
    left.fieldRank - right.fieldRank ||
    left.position - right.position
  )
}

function bestMatch(entry: JokerSearchEntry, query: string, locale: Locale): RankedMatch | null {
  let best: RankedMatch | null = null

  for (const value of entry.values) {
    const match = matchValue(value.normalized, query)
    if (!match) {
      continue
    }

    const ranked: RankedMatch = {
      ...match,
      field: value.field,
      fieldRank: getFieldRank(value.field, locale),
    }

    if (!best || compareMatch(ranked, best) < 0) {
      best = ranked
    }
  }

  return best
}

function resultLimit(value: number | undefined): number {
  if (value === undefined) {
    return Number.POSITIVE_INFINITY
  }

  if (!Number.isFinite(value)) {
    return Number.POSITIVE_INFINITY
  }

  return Math.max(0, Math.floor(value))
}

export function searchJokers(
  index: JokerSearchIndex,
  query: string,
  { locale = 'zh-CN', guessedIds = [], limit, includeDisabled = true }: JokerSearchOptions = {},
): readonly JokerSearchOption[] {
  const normalizedQuery = normalizeSearchText(query)
  const maxResults = resultLimit(limit)

  if (!normalizedQuery || maxResults === 0) {
    return []
  }

  const guessed = new Set(guessedIds)
  const ranked: RankedEntry[] = []

  for (const entry of index.entries) {
    const disabled = guessed.has(entry.joker.id)
    if (disabled && !includeDisabled) {
      continue
    }

    const match = bestMatch(entry, normalizedQuery, locale)
    if (match) {
      ranked.push({ entry, match })
    }
  }

  ranked.sort(
    (left, right) =>
      compareMatch(left.match, right.match) || left.entry.sourceIndex - right.entry.sourceIndex,
  )

  return ranked.slice(0, maxResults).map(({ entry, match }) => ({
    id: entry.joker.id,
    joker: entry.joker,
    primaryName: locale === 'zh-CN' ? entry.joker.name.zhCN : entry.joker.name.en,
    secondaryName: locale === 'zh-CN' ? entry.joker.name.en : entry.joker.name.zhCN,
    disabled: guessed.has(entry.joker.id),
    matchKind: match.kind,
    matchedField: match.field,
  }))
}

export function createJokerCombobox(
  index: JokerSearchIndex,
  options: JokerSearchOptions = {},
): JokerCombobox {
  const guessedIds = new Set(options.guessedIds ?? [])
  const jokersById = new Map(index.entries.map(({ joker }) => [joker.id, joker] as const))
  const stableOptions: JokerSearchOptions = { ...options, guessedIds }

  return {
    getOptions: (query) => searchJokers(index, query, stableOptions),
    getById: (id) => jokersById.get(id),
    canSelect: (id) => jokersById.has(id) && !guessedIds.has(id),
  }
}

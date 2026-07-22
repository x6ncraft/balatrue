import type { Joker } from './data/types'

export type DemoLocale = 'en' | 'zh-CN'
export type DemoJokerQuery = string | number

export interface DemoJokerSummary {
  readonly number: number
  readonly id: string
  readonly en: string
  readonly zhCN: string
}

export interface BalatrueDemoApi {
  /** Prints the available commands and returns the same help text. */
  help(): string
  /** Prints and returns all 150 Jokers in collection order. */
  listJokers(): readonly DemoJokerSummary[]
  /** Starts a fresh local endless round with an exact ID, number, English name, or Chinese name. */
  setAnswer(query: DemoJokerQuery, locale?: DemoLocale): DemoJokerSummary
  /** Restarts the current scripted answer with six empty guesses. */
  restart(locale?: DemoLocale): DemoJokerSummary
  /** Restores the mode, language, endless progress, and shuffle bag from before the demo. */
  restore(): void
}

declare global {
  interface Window {
    balatrueDemo?: BalatrueDemoApi
  }
}

export interface CreateBalatrueDemoApiOptions {
  readonly jokers: readonly Joker[]
  readonly onSetAnswer: (joker: Joker, locale?: DemoLocale) => void
  readonly onRestart: (locale?: DemoLocale) => Joker
  readonly onRestore: () => void
}

const HELP_TEXT = [
  'Balatrue demo console',
  'balatrueDemo.listJokers()                    // list all IDs and bilingual names',
  "balatrueDemo.setAnswer('Lucky Cat', 'en')   // English name, then switch UI to English",
  "balatrueDemo.setAnswer('招财猫')              // exact Chinese name",
  "balatrueDemo.setAnswer('j_lucky_cat')       // stable Joker ID",
  'balatrueDemo.setAnswer(91)                   // collection number',
  "balatrueDemo.restart('en')                   // replay the same scripted answer",
  'balatrueDemo.restore()                       // restore your pre-demo local progress',
].join('\n')

export function demoJokerSummary(joker: Joker): DemoJokerSummary {
  return Object.freeze({
    number: joker.number,
    id: joker.id,
    en: joker.name.en,
    zhCN: joker.name.zhCN,
  })
}

export function demoJokerCatalog(jokers: readonly Joker[]): readonly DemoJokerSummary[] {
  return Object.freeze(
    [...jokers]
      .sort((left, right) => left.number - right.number)
      .map((joker) => demoJokerSummary(joker)),
  )
}

function normalizedQuery(query: DemoJokerQuery): string {
  if (typeof query === 'number') return String(query)
  return query.trim()
}

function validatedLocale(locale: DemoLocale | undefined): DemoLocale | undefined {
  if (locale === undefined || locale === 'en' || locale === 'zh-CN') return locale
  throw new TypeError("Locale must be 'en' or 'zh-CN'.")
}

export function resolveDemoJoker(jokers: readonly Joker[], query: DemoJokerQuery): Joker {
  const normalized = normalizedQuery(query)
  if (!normalized) throw new TypeError('Enter a Joker ID, collection number, or exact name.')

  const number = Number(normalized)
  const byNumber = Number.isInteger(number)
    ? jokers.find((joker) => joker.number === number)
    : undefined
  if (byNumber) return byNumber

  const lowercase = normalized.toLocaleLowerCase('en-US')
  const exact = jokers.find(
    (joker) =>
      joker.id.toLocaleLowerCase('en-US') === lowercase ||
      joker.name.en.toLocaleLowerCase('en-US') === lowercase ||
      joker.name.zhCN === normalized,
  )
  if (exact) return exact

  const suggestions = jokers
    .filter(
      (joker) =>
        joker.id.toLocaleLowerCase('en-US').includes(lowercase) ||
        joker.name.en.toLocaleLowerCase('en-US').includes(lowercase) ||
        joker.name.zhCN.includes(normalized),
    )
    .slice(0, 6)
    .map((joker) => `${joker.name.en} / ${joker.name.zhCN}`)

  const suffix = suggestions.length > 0 ? ` Possible matches: ${suggestions.join(', ')}.` : ''
  throw new RangeError(`No exact Joker matched "${normalized}".${suffix}`)
}

export function createBalatrueDemoApi({
  jokers,
  onSetAnswer,
  onRestart,
  onRestore,
}: CreateBalatrueDemoApiOptions): BalatrueDemoApi {
  const catalog = demoJokerCatalog(jokers)

  return Object.freeze({
    help(): string {
      console.info(HELP_TEXT)
      return HELP_TEXT
    },
    listJokers(): readonly DemoJokerSummary[] {
      console.table(catalog)
      return catalog
    },
    setAnswer(query: DemoJokerQuery, locale?: DemoLocale): DemoJokerSummary {
      const joker = resolveDemoJoker(jokers, query)
      onSetAnswer(joker, validatedLocale(locale))
      const summary = demoJokerSummary(joker)
      console.info(
        `[Balatrue demo] Endless answer set to #${String(summary.number).padStart(3, '0')} ${summary.en} / ${summary.zhCN}.`,
      )
      return summary
    },
    restart(locale?: DemoLocale): DemoJokerSummary {
      const joker = onRestart(validatedLocale(locale))
      const summary = demoJokerSummary(joker)
      console.info(
        `[Balatrue demo] Restarted #${String(summary.number).padStart(3, '0')} ${summary.en} / ${summary.zhCN}.`,
      )
      return summary
    },
    restore(): void {
      onRestore()
      console.info('[Balatrue demo] Restored the local game state from before this demo.')
    },
  })
}

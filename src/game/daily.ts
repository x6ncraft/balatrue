import type { Joker } from '../data/types'
import { getJokerId, getJokerNumber } from './joker-access'
import type { DailyPuzzle } from './types'

export const BEIJING_TIME_ZONE = 'Asia/Shanghai' as const
export const DAILY_ROTATION_SIZE = 150 as const
export const DAILY_EPOCH = '2026-07-18' as const
export const DEFAULT_DAILY_SEED = 'balatrue-daily-v1' as const

export type RandomSource = () => number

const MILLISECONDS_PER_DAY = 86_400_000

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor
}

function parseDateKey(dateKey: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) throw new TypeError(`Invalid Beijing date key: ${dateKey}`)

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const timestamp = Date.UTC(year, month - 1, day)
  const check = new Date(timestamp)
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new TypeError(`Invalid Beijing date key: ${dateKey}`)
  }

  return Math.floor(timestamp / MILLISECONDS_PER_DAY)
}

function coerceDate(value: Date | number | string): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (!Number.isFinite(date.getTime())) throw new TypeError('Date must be valid')
  return date
}

function hashSeed(seed: string): number {
  let hash = 2_166_136_261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}

/** Small deterministic PRNG whose output is stable across JavaScript runtimes. */
export function createSeededRandom(seed: string): RandomSource {
  let state = hashSeed(seed)
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

export function getBeijingDateKey(value: Date | number | string = new Date()): string {
  const date = coerceDate(value)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BEIJING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value
  const year = part('year')
  const month = part('month')
  const day = part('day')
  if (!year || !month || !day) throw new Error('Unable to format Beijing date')
  return `${year}-${month}-${day}`
}

function sortedPool(jokers: readonly Joker[]): Joker[] {
  const pool = [...jokers].sort((left, right) => {
    const numberDifference = getJokerNumber(left) - getJokerNumber(right)
    if (numberDifference !== 0) return numberDifference

    const leftId = getJokerId(left)
    const rightId = getJokerId(right)
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0
  })
  const ids = new Set(pool.map(getJokerId))
  if (ids.size !== pool.length) throw new RangeError('Joker ids must be unique')
  return pool
}

export function createDailyOrder(jokers: readonly Joker[], seed = DEFAULT_DAILY_SEED): Joker[] {
  if (jokers.length !== DAILY_ROTATION_SIZE) {
    throw new RangeError(`Daily mode requires exactly ${DAILY_ROTATION_SIZE} Jokers`)
  }

  const order = sortedPool(jokers)
  const random = createSeededRandom(seed)
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = order[index]
    const swap = order[swapIndex]
    if (!current || !swap) throw new Error('Daily shuffle index is out of bounds')
    order[index] = swap
    order[swapIndex] = current
  }

  return order
}

export function getDailyPuzzle(
  jokers: readonly Joker[],
  value: Date | number | string = new Date(),
  seed = DEFAULT_DAILY_SEED,
): DailyPuzzle<Joker> {
  const dateKey = getBeijingDateKey(value)
  const dayOffset = parseDateKey(dateKey) - parseDateKey(DAILY_EPOCH)
  const rotationIndex = positiveModulo(dayOffset, DAILY_ROTATION_SIZE)
  const answer = createDailyOrder(jokers, seed)[rotationIndex]
  if (!answer) throw new Error('Daily answer is missing')

  return {
    dateKey,
    puzzleNumber: dayOffset + 1,
    rotationIndex,
    answer,
  }
}

export function getDailyAnswer(
  jokers: readonly Joker[],
  value: Date | number | string = new Date(),
  seed = DEFAULT_DAILY_SEED,
): Joker {
  return getDailyPuzzle(jokers, value, seed).answer
}

export function getPracticeAnswer(
  jokers: readonly Joker[],
  random: RandomSource = Math.random,
): Joker {
  if (jokers.length === 0) throw new RangeError('Practice mode requires at least one Joker')
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('Random source must return a value in [0, 1)')
  }

  const answer = sortedPool(jokers)[Math.floor(value * jokers.length)]
  if (!answer) throw new Error('Practice answer is missing')
  return answer
}

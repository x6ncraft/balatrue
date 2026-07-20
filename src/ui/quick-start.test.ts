import { describe, expect, it } from 'vitest'

import { jokers } from '../data'
import { pickQuickStartJokers, QUICK_START_COUNT } from './quick-start'

describe('pickQuickStartJokers', () => {
  it('picks five unique Jokers', () => {
    const picked = pickQuickStartJokers(jokers, [], QUICK_START_COUNT, () => 0.42)

    expect(picked).toHaveLength(5)
    expect(new Set(picked.map((joker) => joker.id))).toHaveLength(5)
  })

  it('can replace the full visible set without repeats', () => {
    const current = pickQuickStartJokers(jokers, [], QUICK_START_COUNT, () => 0.25)
    const replacement = pickQuickStartJokers(
      jokers,
      current.map((joker) => joker.id),
      QUICK_START_COUNT,
      () => 0.75,
    )

    expect(replacement).toHaveLength(5)
    expect(replacement.every((joker) => !current.some((shown) => shown.id === joker.id))).toBe(true)
  })
})

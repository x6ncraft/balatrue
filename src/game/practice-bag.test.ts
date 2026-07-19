import { describe, expect, it } from 'vitest'

import { avoidImmediatePracticeRepeat } from './practice-bag'

describe('avoidImmediatePracticeRepeat', () => {
  it('keeps a complete 150-Joker cycle while moving the previous answer away from the front', () => {
    const ids = Array.from({ length: 150 }, (_, index) => `joker-${index + 1}`)
    const previousAnswerId = ids[0]
    const nextCycle = avoidImmediatePracticeRepeat(ids, previousAnswerId)

    expect(nextCycle).toHaveLength(150)
    expect(new Set(nextCycle)).toEqual(new Set(ids))
    expect(nextCycle[0]).not.toBe(previousAnswerId)
  })

  it('does not reorder a bag that already starts with a different Joker', () => {
    expect(avoidImmediatePracticeRepeat(['next', 'later'], 'previous')).toEqual(['next', 'later'])
  })
})

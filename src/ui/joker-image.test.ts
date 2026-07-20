import { describe, expect, it } from 'vitest'

import { jokerImageUrl } from './joker-image'

describe('jokerImageUrl', () => {
  it('versions the checked-in image with a short local SHA-1', () => {
    expect(jokerImageUrl('/jokers/j_cloud_9.png', '89dc9cb2ae2973933e6308f24b50fe0b08685b25')).toBe(
      '/jokers/j_cloud_9.png?v=89dc9cb2',
    )
  })

  it('uses a distinct URL for the one retry', () => {
    expect(jokerImageUrl('/jokers/j_cloud_9.png', '89dc9cb2ae297393', true)).toBe(
      '/jokers/j_cloud_9.png?v=89dc9cb2&retry=1',
    )
  })

  it('preserves existing query parameters and fragments', () => {
    expect(jokerImageUrl('/jokers/j_cloud_9.png?fit=contain#card', '89dc9cb2ae297393')).toBe(
      '/jokers/j_cloud_9.png?fit=contain&v=89dc9cb2#card',
    )
  })
})

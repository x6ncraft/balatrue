import { jokers } from './data'
import {
  createBalatrueDemoApi,
  demoJokerCatalog,
  resolveDemoJoker,
  type CreateBalatrueDemoApiOptions,
} from './demo-console'
import { afterEach, describe, expect, it, vi } from 'vitest'

const trousers = (() => {
  const joker = jokers.find((candidate) => candidate.id === 'j_trousers')
  if (!joker) throw new Error('Expected Spare Trousers in the production Joker catalog')
  return joker
})()

function demoCallbacks(): Pick<
  CreateBalatrueDemoApiOptions,
  'onSetAnswer' | 'onRestart' | 'onRestore'
> {
  return {
    onSetAnswer: vi.fn(),
    onRestart: vi.fn(() => trousers),
    onRestore: vi.fn(),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('demo Joker catalog', () => {
  it('returns all 150 production Jokers in collection order', () => {
    const catalog = demoJokerCatalog([...jokers].reverse())

    expect(catalog).toHaveLength(150)
    expect(catalog.map((joker) => joker.number)).toEqual(
      Array.from({ length: 150 }, (_, index) => index + 1),
    )
    expect(catalog).toEqual(
      [...jokers]
        .sort((left, right) => left.number - right.number)
        .map((joker) => ({
          number: joker.number,
          id: joker.id,
          en: joker.name.en,
          zhCN: joker.name.zhCN,
        })),
    )
    expect(Object.isFrozen(catalog)).toBe(true)
    expect(catalog.every((joker) => Object.isFrozen(joker))).toBe(true)
  })
})

describe('demo Joker resolution', () => {
  it.each([
    ['collection number', 98],
    ['numeric string', ' 98 '],
    ['stable ID', 'J_TROUSERS'],
    ['English name', '  spare trousers  '],
    ['Chinese name', '备用裤子'],
  ])('resolves an exact %s', (_label, query) => {
    expect(resolveDemoJoker(jokers, query)).toBe(trousers)
  })

  it('offers fuzzy suggestions without selecting a partial match', () => {
    expect(() => resolveDemoJoker(jokers, 'Trouser')).toThrowError(
      /No exact Joker matched "Trouser"\. Possible matches: Spare Trousers \/ 备用裤子\./,
    )
    expect(() => resolveDemoJoker(jokers, '裤子')).toThrowError(
      /No exact Joker matched "裤子"\. Possible matches: Spare Trousers \/ 备用裤子\./,
    )
  })

  it('rejects empty and unknown queries', () => {
    expect(() => resolveDemoJoker(jokers, '   ')).toThrow(TypeError)
    expect(() => resolveDemoJoker(jokers, 'definitely-not-a-joker')).toThrow(
      'No exact Joker matched "definitely-not-a-joker".',
    )
  })
})

describe('Balatrue demo console callbacks', () => {
  it('prints and returns the complete ordered catalog', () => {
    const callbacks = demoCallbacks()
    const table = vi.spyOn(console, 'table').mockImplementation(() => undefined)
    const api = createBalatrueDemoApi({ jokers, ...callbacks })

    const catalog = api.listJokers()

    expect(catalog).toHaveLength(150)
    expect(catalog[0]?.number).toBe(1)
    expect(catalog.at(-1)?.number).toBe(150)
    expect(table).toHaveBeenCalledOnce()
    expect(table).toHaveBeenCalledWith(catalog)
  })

  it('sets an exact answer and forwards the requested locale', () => {
    const callbacks = demoCallbacks()
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const api = createBalatrueDemoApi({ jokers, ...callbacks })

    const result = api.setAnswer('备用裤子', 'en')

    expect(callbacks.onSetAnswer).toHaveBeenCalledOnce()
    expect(callbacks.onSetAnswer).toHaveBeenCalledWith(trousers, 'en')
    expect(result).toEqual({
      number: 98,
      id: 'j_trousers',
      en: 'Spare Trousers',
      zhCN: '备用裤子',
    })
  })

  it('does not invoke set when a query is only a fuzzy match', () => {
    const callbacks = demoCallbacks()
    const api = createBalatrueDemoApi({ jokers, ...callbacks })

    expect(() => api.setAnswer('Trouser')).toThrow(/Possible matches: Spare Trousers/)
    expect(callbacks.onSetAnswer).not.toHaveBeenCalled()
  })

  it('rejects an unsupported locale before changing the game', () => {
    const callbacks = demoCallbacks()
    const api = createBalatrueDemoApi({ jokers, ...callbacks })

    expect(() => api.setAnswer('备用裤子', 'fr' as never)).toThrow(
      "Locale must be 'en' or 'zh-CN'.",
    )
    expect(callbacks.onSetAnswer).not.toHaveBeenCalled()
  })

  it('forwards restart and restore while returning the restarted answer', () => {
    const callbacks = demoCallbacks()
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const api = createBalatrueDemoApi({ jokers, ...callbacks })

    const restarted = api.restart('zh-CN')
    api.restore()

    expect(callbacks.onRestart).toHaveBeenCalledOnce()
    expect(callbacks.onRestart).toHaveBeenCalledWith('zh-CN')
    expect(restarted.id).toBe('j_trousers')
    expect(callbacks.onRestore).toHaveBeenCalledOnce()
  })
})

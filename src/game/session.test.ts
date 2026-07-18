import { JOKER_CLASSIFICATION_VERSION, JOKER_DATA_GAME_VERSION, type Joker } from '../data/types'
import { describe, expect, it } from 'vitest'
import { deserializeGameState, serializeGameState } from './persistence'
import { createDailyGame, createPracticeGame, submitGuess } from './session'

function makeJoker(number: number): Joker {
  const id = `j_${String(number).padStart(3, '0')}`
  return {
    id,
    number,
    name: { en: `Joker ${number}`, zhCN: `小丑 ${number}` },
    imagePath: `/jokers/${id}.png`,
    official: {
      gameVersion: JOKER_DATA_GAME_VERSION,
      rarity: number % 2 === 0 ? 'uncommon' : 'common',
      cost: (number % 9) + 1,
      shopPurchasable: true,
    },
    source: {
      wikiPageUrl: `https://example.com/${id}`,
      effectTextEn: 'Fixture effect',
      unlockRequirementEn: 'Available from start.',
      wikiType: 'effect',
      wikiActivation: 'passive',
      imageUrl: `https://example.com/${id}.png`,
      imageSha1: id,
      localImageSha1: id,
      imageWidth: 71,
      imageHeight: 95,
    },
    classification: {
      version: JOKER_CLASSIFICATION_VERSION,
      acquisition: { kind: 'shop', unlockState: 'starting' },
      effects: number % 3 === 0 ? ['chips'] : ['mechanism'],
      timings: ['passive'],
      dependencies: [{ family: 'none' }],
    },
  }
}

describe('game sessions', () => {
  it('creates a practice game with an injected answer and at most eight attempts', () => {
    const state = createPracticeGame([makeJoker(3), makeJoker(1), makeJoker(2)], () => 0)

    expect(state).toEqual({
      version: 1,
      mode: 'practice',
      puzzleKey: 'practice:j_001',
      answerId: 'j_001',
      maxAttempts: 8,
      status: 'playing',
      guesses: [],
    })
    expect(() => createPracticeGame([makeJoker(1)], () => 0, { maxAttempts: 9 })).toThrow(
      'maxAttempts must be an integer between 1 and 8',
    )
  })

  it('pins a daily answer and Beijing puzzle key in serializable state', () => {
    const pool = Array.from({ length: 150 }, (_, index) => makeJoker(index + 1))
    const state = createDailyGame(pool, '2026-07-17T16:00:00Z')

    expect(state.mode).toBe('daily')
    expect(state.puzzleKey).toBe('2026-07-18')
    expect(state.answerId).toMatch(/^j_\d{3}$/)
  })

  it('wins immediately when the pinned answer is guessed without mutating prior state', () => {
    const answer = makeJoker(1)
    const initial = createPracticeGame([answer, makeJoker(2)], () => 0)
    const next = submitGuess(initial, answer, answer)

    expect(initial.status).toBe('playing')
    expect(initial.guesses).toEqual([])
    expect(next.status).toBe('won')
    expect(next.guesses).toHaveLength(1)
    expect(next.guesses[0]?.correct).toBe(true)
  })

  it('loses after the configured final attempt', () => {
    const answer = makeJoker(1)
    const wrong = Array.from({ length: 8 }, (_, index) => makeJoker(index + 2))
    let state = createPracticeGame([answer, ...wrong], () => 0)

    wrong.forEach((guess, index) => {
      state = submitGuess(state, guess, answer)
      expect(state.status).toBe(index === 7 ? 'lost' : 'playing')
    })

    expect(state.guesses).toHaveLength(8)
  })

  it('rejects duplicate guesses, mismatched answers, and completed games', () => {
    const answer = makeJoker(1)
    const wrong = makeJoker(2)
    const initial = createPracticeGame([answer, wrong], () => 0)
    const afterWrong = submitGuess(initial, wrong, answer)

    expect(() => submitGuess(afterWrong, wrong, answer)).toThrow('already been guessed')
    expect(() => submitGuess(initial, wrong, makeJoker(3))).toThrow(
      'Answer does not match the answer pinned in game state',
    )

    const won = submitGuess(initial, answer, answer)
    expect(() => submitGuess(won, wrong, answer)).toThrow(
      'Cannot submit a guess to a completed game',
    )
  })
})

describe('game state persistence', () => {
  it('round-trips a completed state through JSON', () => {
    const answer = makeJoker(1)
    const initial = createPracticeGame([answer, makeJoker(2)], () => 0)
    const won = submitGuess(initial, answer, answer)
    const restored = deserializeGameState(serializeGameState(won))

    expect(restored).toEqual(won)
  })

  it('returns null for malformed or internally inconsistent state', () => {
    expect(deserializeGameState('{bad json')).toBeNull()
    expect(
      deserializeGameState(
        JSON.stringify({
          version: 1,
          mode: 'daily',
          puzzleKey: '2026-07-18',
          answerId: 'j_answer',
          maxAttempts: 8,
          status: 'lost',
          guesses: [],
        }),
      ),
    ).toBeNull()
  })

  it('rejects restored states with repeated guesses or guesses after a win', () => {
    const answer = makeJoker(1)
    const wrong = makeJoker(2)
    const initial = createPracticeGame([answer, wrong], () => 0)
    const afterWrong = submitGuess(initial, wrong, answer)
    const won = submitGuess(afterWrong, answer, answer)

    expect(
      deserializeGameState(
        JSON.stringify({ ...afterWrong, guesses: [...afterWrong.guesses, ...afterWrong.guesses] }),
      ),
    ).toBeNull()
    expect(
      deserializeGameState(JSON.stringify({ ...won, guesses: [...won.guesses].reverse() })),
    ).toBeNull()
    expect(deserializeGameState(JSON.stringify({ ...won, answerId: wrong.id }))).toBeNull()
  })

  it('refuses to serialize invalid state supplied across a trust boundary', () => {
    const invalid = {
      version: 1,
      mode: 'practice',
      puzzleKey: 'practice:test',
      answerId: 'j_answer',
      maxAttempts: 99,
      status: 'playing',
      guesses: [],
    }

    expect(() => serializeGameState(invalid as never)).toThrow(
      'Cannot serialize an invalid game state',
    )
  })
})

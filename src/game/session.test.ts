import { JOKER_CLASSIFICATION_VERSION, JOKER_DATA_GAME_VERSION, type Joker } from '../data/types'
import { describe, expect, it } from 'vitest'
import { GAME_CLUE_MODEL_VERSION } from './clue-model'
import {
  deserializeGameState,
  GAME_STORAGE_FALLBACK_CLASSIFICATION_VERSIONS,
  gameStorageKey,
  restoreStoredGame,
  serializeGameState,
} from './persistence'
import { createDailyGame, createPracticeGame, markCollectionUsed, submitGuess } from './session'
import type { GameState } from './types'

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
      effectTextSha256: '0'.repeat(64),
      unlockRequirementSha256: '0'.repeat(64),
      wikiType: 'effect',
      wikiActivation: 'passive',
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

function replayWithCurrentJokers(state: GameState, pool: readonly Joker[]): GameState | null {
  const byId = new Map(pool.map((joker) => [joker.id, joker]))
  const answer = byId.get(state.answerId)
  if (!answer) return null
  let replayed: GameState = { ...state, status: 'playing', guesses: [] }
  for (const storedGuess of state.guesses) {
    const guess = byId.get(storedGuess.guessId)
    if (!guess) return null
    replayed = submitGuess(replayed, guess, answer)
  }
  return replayed
}

describe('game sessions', () => {
  it('creates an unassisted practice game with an injected answer and at most six attempts', () => {
    const state = createPracticeGame([makeJoker(3), makeJoker(1), makeJoker(2)], () => 0)

    expect(state).toEqual({
      version: 2,
      mode: 'practice',
      puzzleKey: 'practice:j_001',
      answerId: 'j_001',
      maxAttempts: 6,
      status: 'playing',
      guesses: [],
      usedCollection: false,
    })
    expect(() => createPracticeGame([makeJoker(1)], () => 0, { maxAttempts: 7 })).toThrow(
      'maxAttempts must be an integer between 1 and 6',
    )
  })

  it('marks only an active game as collection-assisted without mutating it', () => {
    const answer = makeJoker(1)
    const initial = createPracticeGame([answer], () => 0)
    const assisted = markCollectionUsed(initial)

    expect(initial.usedCollection).toBe(false)
    expect(assisted).not.toBe(initial)
    expect(assisted.usedCollection).toBe(true)
    expect(markCollectionUsed(assisted)).toBe(assisted)

    const completed = submitGuess(initial, answer, answer)
    expect(markCollectionUsed(completed)).toBe(completed)
    expect(completed.usedCollection).toBe(false)
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
    const wrong = Array.from({ length: 6 }, (_, index) => makeJoker(index + 2))
    let state = createPracticeGame([answer, ...wrong], () => 0)

    wrong.forEach((guess, index) => {
      state = submitGuess(state, guess, answer)
      expect(state.status).toBe(index === 5 ? 'lost' : 'playing')
    })

    expect(state.guesses).toHaveLength(6)
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
  it('versions current storage keys by the player-facing clue model', () => {
    expect(
      gameStorageKey(
        JOKER_DATA_GAME_VERSION,
        JOKER_CLASSIFICATION_VERSION,
        'daily',
        '2026-07-19',
        GAME_CLUE_MODEL_VERSION,
      ),
    ).toBe(
      `balatrue:game:${JOKER_DATA_GAME_VERSION}:c${JOKER_CLASSIFICATION_VERSION}:g${GAME_CLUE_MODEL_VERSION}:daily:2026-07-19`,
    )
    expect(
      gameStorageKey(
        JOKER_DATA_GAME_VERSION,
        JOKER_CLASSIFICATION_VERSION,
        'practice',
        undefined,
        GAME_CLUE_MODEL_VERSION,
      ),
    ).toBe(
      `balatrue:game:${JOKER_DATA_GAME_VERSION}:c${JOKER_CLASSIFICATION_VERSION}:g${GAME_CLUE_MODEL_VERSION}:practice`,
    )
    expect(() =>
      gameStorageKey(
        JOKER_DATA_GAME_VERSION,
        JOKER_CLASSIFICATION_VERSION,
        'practice',
        undefined,
        0,
      ),
    ).toThrow('clueModelVersion must be a positive integer')
  })

  it('round-trips the collection-assistance flag through JSON', () => {
    const answer = makeJoker(1)
    const initial = createPracticeGame([answer, makeJoker(2)], () => 0)
    const won = submitGuess(markCollectionUsed(initial), answer, answer)
    const restored = deserializeGameState(serializeGameState(won))

    expect(restored).toEqual(won)
    expect(restored?.usedCollection).toBe(true)
  })

  it('returns null for malformed or internally inconsistent state', () => {
    expect(deserializeGameState('{bad json')).toBeNull()
    expect(
      deserializeGameState(
        JSON.stringify({
          version: 2,
          mode: 'daily',
          puzzleKey: '2026-07-18',
          answerId: 'j_answer',
          maxAttempts: 6,
          status: 'playing',
          guesses: [],
        }),
      ),
    ).toBeNull()
    expect(
      deserializeGameState(
        JSON.stringify({
          version: 1,
          mode: 'daily',
          puzzleKey: '2026-07-18',
          answerId: 'j_answer',
          maxAttempts: 6,
          status: 'lost',
          guesses: [],
        }),
      ),
    ).toBeNull()
  })

  it('migrates valid v1 saves as unassisted while preserving an active legacy attempt limit', () => {
    const answer = makeJoker(1)
    const wrong = makeJoker(2)
    const current = submitGuess(
      createPracticeGame([answer, wrong], () => 0),
      wrong,
      answer,
    )
    const legacy = {
      ...current,
      version: 1,
      maxAttempts: 8,
      usedCollection: undefined,
    }
    const restored = deserializeGameState(JSON.stringify(legacy))

    expect(restored).toMatchObject({
      version: 2,
      maxAttempts: 8,
      status: 'playing',
      usedCollection: false,
    })
    expect(restored?.guesses).toEqual(current.guesses)
  })

  it('restores a real c2 daily key through explicit classification fallbacks and writes current', () => {
    const pool = Array.from({ length: 150 }, (_, index) => makeJoker(index + 1))
    const current = createDailyGame(pool, '2026-07-19T12:00:00+08:00')
    const answer = pool.find((joker) => joker.id === current.answerId)
    const wrong = pool.find((joker) => joker.id !== current.answerId)
    if (!answer || !wrong) throw new Error('Fixture setup failed')
    const afterWrong = submitGuess(current, wrong, answer)
    const originalComparison = afterWrong.guesses[0]
    if (!originalComparison) throw new Error('Fixture comparison missing')
    const staleComparison = {
      ...originalComparison,
      rarity: {
        ...originalComparison.rarity,
        result: 'exact' as const,
        direction: null,
      },
      effects: { values: ['stale'], matches: ['stale'], result: 'exact' as const },
    }
    const legacy = JSON.stringify({
      ...afterWrong,
      version: 1,
      maxAttempts: 8,
      guesses: [staleComparison],
      usedCollection: undefined,
    })

    const currentKey = gameStorageKey(
      JOKER_DATA_GAME_VERSION,
      JOKER_CLASSIFICATION_VERSION,
      'daily',
      current.puzzleKey,
      GAME_CLUE_MODEL_VERSION,
    )
    const c2Key = gameStorageKey(JOKER_DATA_GAME_VERSION, 2, 'daily', current.puzzleKey)
    const storage = new Map([[c2Key, legacy]])
    const reads: string[] = []
    const legacyCurrentKey = gameStorageKey(
      JOKER_DATA_GAME_VERSION,
      JOKER_CLASSIFICATION_VERSION,
      'daily',
      current.puzzleKey,
    )
    const fallbackKeys = [
      legacyCurrentKey,
      ...GAME_STORAGE_FALLBACK_CLASSIFICATION_VERSIONS.filter(
        (version) => version < JOKER_CLASSIFICATION_VERSION,
      ).map((version) =>
        gameStorageKey(JOKER_DATA_GAME_VERSION, version, 'daily', current.puzzleKey),
      ),
    ]
    expect(GAME_STORAGE_FALLBACK_CLASSIFICATION_VERSIONS).toEqual([8, 7, 6, 5, 4, 3, 2])

    const restored = restoreStoredGame({
      currentKey,
      fallbackKeys,
      context: { mode: 'daily', puzzleKey: current.puzzleKey, answerId: current.answerId },
      validJokerIds: new Set(pool.map((joker) => joker.id)),
      read: (key) => {
        reads.push(key)
        return storage.get(key) ?? null
      },
      write: (key, value) => storage.set(key, value),
      refreshFallback: (state) => replayWithCurrentJokers(state, pool),
    })

    expect(reads).toEqual([currentKey, ...fallbackKeys])
    expect(restored).toMatchObject({
      version: 2,
      maxAttempts: 8,
      status: 'playing',
      usedCollection: false,
    })
    expect(restored?.guesses[0]).toEqual(afterWrong.guesses[0])
    expect(restored?.guesses[0]).not.toEqual(staleComparison)
    const written = deserializeGameState(storage.get(currentKey) ?? '')
    expect(written).toEqual(restored)
  })

  it('preserves an assisted eight-attempt loss while refreshing a c4 practice game', () => {
    const pool = Array.from({ length: 150 }, (_, index) => makeJoker(index + 1))
    let stored: GameState = {
      ...createPracticeGame(pool, () => 0),
      maxAttempts: 8,
      usedCollection: true,
    }
    const answer = pool.find((joker) => joker.id === stored.answerId)
    const wrong = pool.filter((joker) => joker.id !== stored.answerId).slice(0, 8)
    if (!answer || wrong.length !== 8) throw new Error('Fixture setup failed')
    for (const guess of wrong) stored = submitGuess(stored, guess, answer)

    const currentKey = gameStorageKey(
      JOKER_DATA_GAME_VERSION,
      JOKER_CLASSIFICATION_VERSION,
      'practice',
      undefined,
      GAME_CLUE_MODEL_VERSION,
    )
    const c4Key = gameStorageKey(JOKER_DATA_GAME_VERSION, 4, 'practice')
    const storage = new Map([[c4Key, serializeGameState(stored)]])
    const restored = restoreStoredGame({
      currentKey,
      fallbackKeys: [c4Key],
      context: { mode: 'practice' },
      validJokerIds: new Set(pool.map((joker) => joker.id)),
      read: (key) => storage.get(key) ?? null,
      write: (key, value) => storage.set(key, value),
      refreshFallback: (state) => replayWithCurrentJokers(state, pool),
    })

    expect(restored).toMatchObject({
      maxAttempts: 8,
      status: 'lost',
      usedCollection: true,
    })
    expect(restored?.guesses.map((guess) => guess.guessId)).toEqual(
      stored.guesses.map((guess) => guess.guessId),
    )
    expect(deserializeGameState(storage.get(currentKey) ?? '')).toEqual(restored)
  })

  it('keeps a valid current-key comparison without invoking fallback refresh', () => {
    const pool = Array.from({ length: 150 }, (_, index) => makeJoker(index + 1))
    const current = createDailyGame(pool, '2026-07-19T12:00:00+08:00')
    const answer = pool.find((joker) => joker.id === current.answerId)
    const wrong = pool.find((joker) => joker.id !== current.answerId)
    if (!answer || !wrong) throw new Error('Fixture setup failed')
    const stored = submitGuess(current, wrong, answer)
    const currentKey = gameStorageKey(
      JOKER_DATA_GAME_VERSION,
      JOKER_CLASSIFICATION_VERSION,
      'daily',
      current.puzzleKey,
      GAME_CLUE_MODEL_VERSION,
    )
    let refreshCalls = 0

    const restored = restoreStoredGame({
      currentKey,
      fallbackKeys: [],
      context: { mode: 'daily', puzzleKey: current.puzzleKey, answerId: current.answerId },
      validJokerIds: new Set(pool.map((joker) => joker.id)),
      read: (key) => (key === currentKey ? serializeGameState(stored) : null),
      write: () => undefined,
      refreshFallback: () => {
        refreshCalls += 1
        return null
      },
    })

    expect(restored).toEqual(stored)
    expect(refreshCalls).toBe(0)
  })

  it('rejects historical keys whose mode, date, answer, or Joker IDs do not match', () => {
    const pool = Array.from({ length: 150 }, (_, index) => makeJoker(index + 1))
    const current = createDailyGame(pool, '2026-07-19T12:00:00+08:00')
    const answer = pool.find((joker) => joker.id === current.answerId)
    const wrong = pool.find((joker) => joker.id !== current.answerId)
    const another = pool.find((joker) => joker.id !== current.answerId && joker.id !== wrong?.id)
    if (!answer || !wrong || !another) throw new Error('Fixture setup failed')
    const afterWrong = submitGuess(current, wrong, answer)
    const currentKey = gameStorageKey(
      JOKER_DATA_GAME_VERSION,
      JOKER_CLASSIFICATION_VERSION,
      'daily',
      current.puzzleKey,
      GAME_CLUE_MODEL_VERSION,
    )
    const fallbackKey = gameStorageKey(JOKER_DATA_GAME_VERSION, 4, 'daily', current.puzzleKey)
    const validJokerIds = new Set(pool.map((joker) => joker.id))
    const invalidStates = [
      { ...afterWrong, mode: 'practice', puzzleKey: 'practice:test' },
      { ...afterWrong, puzzleKey: '2026-07-18' },
      { ...afterWrong, answerId: another.id },
      {
        ...afterWrong,
        guesses: [{ ...afterWrong.guesses[0], guessId: 'j_removed_from_current_data' }],
      },
    ]

    for (const invalid of invalidStates) {
      const storage = new Map([[fallbackKey, JSON.stringify(invalid)]])
      const restored = restoreStoredGame({
        currentKey,
        fallbackKeys: [fallbackKey],
        context: { mode: 'daily', puzzleKey: current.puzzleKey, answerId: current.answerId },
        validJokerIds,
        read: (key) => storage.get(key) ?? null,
        write: (key, value) => storage.set(key, value),
        refreshFallback: (state) => replayWithCurrentJokers(state, pool),
      })

      expect(restored).toBeNull()
      expect(storage.has(currentKey)).toBe(false)
    }
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
      version: 2,
      mode: 'practice',
      puzzleKey: 'practice:test',
      answerId: 'j_answer',
      maxAttempts: 99,
      status: 'playing',
      guesses: [],
      usedCollection: false,
    }

    expect(() => serializeGameState(invalid as never)).toThrow(
      'Cannot serialize an invalid game state',
    )
  })
})

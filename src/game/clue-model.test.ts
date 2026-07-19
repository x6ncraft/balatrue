import {
  JOKER_CLASSIFICATION_VERSION,
  JOKER_DATA_GAME_VERSION,
  type Joker,
  type JokerDependency,
  type JokerTiming,
} from '../data/types'
import { describe, expect, it } from 'vitest'
import {
  projectJokerDependencies,
  projectJokerTimings,
  type GameDependencyFamily,
  type GameTiming,
} from './clue-model'

function makeJoker(options: { timings?: JokerTiming[]; dependencies?: JokerDependency[] }): Joker {
  return {
    id: 'j_fixture',
    number: 1,
    name: { en: 'Fixture', zhCN: '测试小丑' },
    imagePath: '/jokers/j_fixture.png',
    official: {
      gameVersion: JOKER_DATA_GAME_VERSION,
      rarity: 'common',
      cost: 5,
      shopPurchasable: true,
    },
    source: {
      wikiPageUrl: 'https://example.com/j_fixture',
      effectTextEn: 'Fixture effect',
      unlockRequirementEn: 'Available from start.',
      wikiType: 'effect',
      wikiActivation: 'passive',
      imageUrl: 'https://example.com/j_fixture.png',
      imageSha1: 'fixture',
      localImageSha1: 'fixture',
      imageWidth: 71,
      imageHeight: 95,
    },
    classification: {
      version: JOKER_CLASSIFICATION_VERSION,
      acquisition: { kind: 'shop', unlockState: 'starting' },
      effects: ['mechanism'],
      timings: options.timings ?? ['passive'],
      dependencies: options.dependencies ?? [{ family: 'none' }],
    },
  }
}

describe('player-facing clue projection', () => {
  const timingCases: ReadonlyArray<[JokerTiming, GameTiming]> = [
    ['passive', 'always'],
    ['hand_scored', 'play'],
    ['card_scored', 'play'],
    ['card_played', 'play'],
    ['card_held', 'held'],
    ['card_discarded', 'discard'],
    ['blind_selected', 'blind'],
    ['shop', 'shop'],
    ['round_end', 'round_end'],
    ['sold', 'shop'],
    ['joker_triggered', 'play'],
    ['mixed', 'growth'],
  ]

  it.each(timingCases)('maps raw timing %s to %s', (raw, expected) => {
    expect(projectJokerTimings(makeJoker({ timings: [raw] }))).toEqual([expected])
  })

  it('deduplicates merged timing tags in the fixed player-facing order', () => {
    expect(
      projectJokerTimings(
        makeJoker({
          timings: ['mixed', 'round_end', 'card_played', 'hand_scored', 'passive'],
        }),
      ),
    ).toEqual(['always', 'play', 'round_end', 'growth'])
  })

  const dependencyCases: ReadonlyArray<[JokerDependency['family'], GameDependencyFamily]> = [
    ['suit', 'cards'],
    ['rank', 'cards'],
    ['playing_card', 'cards'],
    ['card_modifier', 'cards'],
    ['deck', 'cards'],
    ['poker_hand', 'hand_type'],
    ['discard', 'actions'],
    ['hand', 'actions'],
    ['money', 'economy'],
    ['shop', 'economy'],
    ['joker', 'jokers'],
    ['joker_slot', 'jokers'],
    ['consumable', 'consumables'],
    ['round', 'progress'],
    ['blind', 'progress'],
    ['none', 'none'],
  ]

  it.each(dependencyCases)('maps raw dependency %s to %s', (raw, expected) => {
    const dependencies = projectJokerDependencies(makeJoker({ dependencies: [{ family: raw }] }))

    expect(dependencies).toEqual([
      expected === 'none' ? { family: 'none' } : { family: expected, value: raw },
    ])
  })

  it('keeps audited source detail while removing redundant generic card detail', () => {
    expect(
      projectJokerDependencies(
        makeJoker({
          dependencies: [
            { family: 'playing_card' },
            { family: 'suit', value: 'hearts' },
            { family: 'rank', value: 'ace' },
          ],
        }),
      ),
    ).toEqual([
      { family: 'cards', value: 'rank:ace' },
      { family: 'cards', value: 'suit:hearts' },
    ])
  })
})

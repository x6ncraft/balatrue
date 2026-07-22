import type { Joker } from '../data/types'
import {
  getJokerDependencies,
  getJokerEffectDetails,
  getJokerTimingFamilies,
} from '../game/joker-access'
import { t, type Locale } from '../i18n'
import { dependenciesLabel, effectDetailsLabel, rarityLabel, timingFamiliesLabel } from './labels'

export type JokerFactKey = 'rarity' | 'price' | 'effect' | 'timing' | 'dependency'

export interface JokerFact {
  key: JokerFactKey
  label: string
  value: string
  accessibleValue?: string
}

export function jokerPriceLabel(joker: Joker, locale: Locale): string {
  return joker.classification.acquisition.kind === 'soul'
    ? t(locale, 'collection.soul')
    : `$${joker.official.cost ?? '—'}`
}

export function jokerFacts(joker: Joker, locale: Locale): JokerFact[] {
  return [
    {
      key: 'rarity',
      label: t(locale, 'clue.rarity'),
      value: rarityLabel(joker.official.rarity, locale),
    },
    {
      key: 'price',
      label: t(locale, 'clue.price'),
      value: jokerPriceLabel(joker, locale),
    },
    {
      key: 'effect',
      label: t(locale, 'clue.effect'),
      value: effectDetailsLabel(getJokerEffectDetails(joker), locale),
    },
    {
      key: 'timing',
      label: t(locale, 'clue.timing'),
      value: timingFamiliesLabel(getJokerTimingFamilies(joker), locale),
    },
    {
      key: 'dependency',
      label: t(locale, 'clue.dependency'),
      value: dependenciesLabel(getJokerDependencies(joker), locale),
    },
  ]
}

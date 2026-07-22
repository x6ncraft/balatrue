import type { Joker } from '../data/types'
import { getJokerEffectDetails } from '../game'
import type { GuessComparison } from '../game/types'
import { t, type Locale } from '../i18n'
import {
  compactDependenciesLabel,
  dependencyDetailsLabel,
  effectDetailValuesLabel,
  effectValuesLabel,
  rarityLabel,
  timingFamiliesLabel,
} from '../ui/labels'
import FeedbackCell from './FeedbackCell'
import JokerImage from './JokerImage'

export interface GuessRowProps {
  readonly joker: Joker
  readonly comparison: GuessComparison
  readonly locale: Locale
}

export function GuessRow({ joker, comparison, locale }: GuessRowProps) {
  const primaryName = locale === 'zh-CN' ? joker.name.zhCN : joker.name.en
  const secondaryName = locale === 'zh-CN' ? joker.name.en : joker.name.zhCN
  const priceLabel =
    comparison.acquisition.kind === 'soul'
      ? locale === 'zh-CN'
        ? '灵魂牌'
        : 'The Soul'
      : `$${comparison.acquisition.shopPrice ?? '—'}`
  const effectsLabel = effectValuesLabel(comparison.effects.values, locale)
  const timingsLabel = timingFamiliesLabel(comparison.timings.values, locale)
  const dependencySummary = compactDependenciesLabel(comparison.dependencies.values, locale)
  const guessedEffectDetails = effectDetailValuesLabel(getJokerEffectDetails(joker), locale)
  const guessedDependencyDetails = dependencyDetailsLabel(comparison.dependencies.values, locale)
  return (
    <article className="guess-row" aria-label={primaryName}>
      <div className="joker-cell">
        <JokerImage
          joker={joker}
          alt={t(locale, 'a11y.jokerImage', { name: primaryName })}
          fallbackLabel={t(locale, 'error.imageUnavailable')}
          width="44"
          height="60"
        />
        <div className="joker-cell__name">
          <strong>{primaryName}</strong>
          <small>{secondaryName}</small>
        </div>
      </div>
      <FeedbackCell
        label={t(locale, 'clue.rarity')}
        value={rarityLabel(comparison.rarity.value, locale)}
        result={comparison.rarity.result}
        direction={comparison.rarity.direction}
        cellIndex={0}
        locale={locale}
      />
      <FeedbackCell
        label={t(locale, 'clue.price')}
        value={priceLabel}
        result={comparison.acquisition.result}
        direction={comparison.acquisition.direction}
        cellIndex={1}
        locale={locale}
      />
      <FeedbackCell
        label={t(locale, 'clue.effect')}
        value={effectsLabel}
        detail={guessedEffectDetails || undefined}
        result={comparison.effects.result}
        cellIndex={2}
        locale={locale}
      />
      <FeedbackCell
        label={t(locale, 'clue.timing')}
        value={timingsLabel}
        result={comparison.timings.result}
        cellIndex={3}
        locale={locale}
      />
      <FeedbackCell
        label={t(locale, 'clue.dependency')}
        value={dependencySummary}
        detail={guessedDependencyDetails || undefined}
        result={comparison.dependencies.result}
        cellIndex={4}
        locale={locale}
      />
    </article>
  )
}

export default GuessRow

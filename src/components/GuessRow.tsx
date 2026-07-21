import type { Joker } from '../data/types'
import { getJokerEffects } from '../game'
import type { GuessComparison } from '../game/types'
import { t, type Locale } from '../i18n'
import {
  compactDependenciesLabel,
  dependenciesLabel,
  effectMechanismsLabel,
  effectValuesLabel,
  narrowDependenciesLabel,
  narrowEffectValuesLabel,
  narrowTimingFamiliesLabel,
  partialDependencyDetailLabel,
  partialEffectDetailLabel,
  partialTimingDetailLabel,
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
  const narrowEffectsLabel = narrowEffectValuesLabel(comparison.effects.values, locale)
  const narrowTimingsLabel = narrowTimingFamiliesLabel(comparison.timings.values, locale)
  const narrowDependencySummary = narrowDependenciesLabel(comparison.dependencies.values, locale)
  const exactEffectsLabel = effectMechanismsLabel(getJokerEffects(joker), locale)
  const exactDependenciesLabel = dependenciesLabel(comparison.dependencies.values, locale)
  const effectDetail =
    comparison.effects.result === 'partial'
      ? partialEffectDetailLabel(
          getJokerEffects(joker),
          comparison.effects.exactMechanismMatches,
          comparison.effects.categoryOnlyMatches,
          locale,
        )
      : undefined
  const timingDetail =
    comparison.timings.result === 'partial'
      ? partialTimingDetailLabel(comparison.timings.values, comparison.timings.matches, locale)
      : undefined
  const dependencyDetail =
    comparison.dependencies.result === 'partial'
      ? partialDependencyDetailLabel(
          comparison.dependencies.values,
          comparison.dependencies.exactMatches,
          comparison.dependencies.familyMatches,
          locale,
        )
      : undefined
  const partialDetails = [
    { key: 'effect', label: t(locale, 'clue.effect'), detail: effectDetail },
    { key: 'timing', label: t(locale, 'clue.timing'), detail: timingDetail },
    { key: 'dependency', label: t(locale, 'clue.dependency'), detail: dependencyDetail },
  ].filter((item): item is typeof item & { detail: string } => Boolean(item.detail))

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
        compactValue={narrowEffectsLabel}
        detail={effectDetail}
        accessibleValue={exactEffectsLabel}
        result={comparison.effects.result}
        cellIndex={2}
        locale={locale}
      />
      <FeedbackCell
        label={t(locale, 'clue.timing')}
        value={timingsLabel}
        compactValue={narrowTimingsLabel}
        detail={timingDetail}
        result={comparison.timings.result}
        cellIndex={3}
        locale={locale}
      />
      <FeedbackCell
        label={t(locale, 'clue.dependency')}
        value={dependencySummary}
        compactValue={narrowDependencySummary}
        detail={dependencyDetail}
        accessibleValue={exactDependenciesLabel}
        result={comparison.dependencies.result}
        cellIndex={4}
        locale={locale}
      />
      {partialDetails.length > 0 ? (
        <div className="guess-row__details" aria-hidden="true">
          {partialDetails.map((item) => (
            <span className="guess-row__detail" key={item.key}>
              <strong>{item.label}</strong>
              <span className="guess-row__detail-text">{item.detail}</span>
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
}

export default GuessRow

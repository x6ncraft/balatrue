import { Check, Copy, RefreshCw } from 'lucide-react'

import type { Joker } from '../data/types'
import type { GameState } from '../game/types'
import { t, type Locale } from '../i18n'
import { jokerFacts } from '../ui/joker-facts'
import JokerImage from './JokerImage'

export interface ResultBannerProps {
  readonly state: GameState
  readonly answer: Joker
  readonly locale: Locale
  readonly copied: boolean
  readonly onShare: () => void
  readonly onNext: () => void
}

export function ResultBanner({
  state,
  answer,
  locale,
  copied,
  onShare,
  onNext,
}: ResultBannerProps) {
  const won = state.status === 'won'
  const primaryName = locale === 'zh-CN' ? answer.name.zhCN : answer.name.en
  const secondaryName = locale === 'zh-CN' ? answer.name.en : answer.name.zhCN
  const facts = jokerFacts(answer, locale)

  return (
    <section className={`result-banner${won ? ' result-banner--won' : ''}`}>
      <JokerImage
        joker={answer}
        alt={t(locale, 'a11y.jokerImage', { name: primaryName })}
        fallbackLabel={t(locale, 'error.imageUnavailable')}
        width="70"
        height="94"
      />
      <div className="result-banner__copy">
        <div aria-live="polite">
          <p className="result-banner__eyebrow">
            {won ? t(locale, 'result.winTitle') : t(locale, 'result.lossTitle')}
          </p>
          <h2>{primaryName}</h2>
          <p>
            {secondaryName} ·{' '}
            {won
              ? t(locale, 'result.winMessage', { count: state.guesses.length })
              : t(locale, 'result.lossMessage', { name: primaryName })}
          </p>
        </div>
        {state.mode === 'daily' && state.usedCollection ? (
          <p className="result-banner__assisted">{t(locale, 'game.assisted')}</p>
        ) : null}
      </div>
      <dl className="result-banner__facts" aria-label={t(locale, 'result.attributes')}>
        {facts.map((fact) => (
          <div key={fact.key}>
            <dt>{fact.label}</dt>
            <dd
              aria-label={fact.accessibleValue}
              title={fact.accessibleValue !== fact.value ? fact.accessibleValue : undefined}
            >
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="result-banner__actions">
        <button className="secondary-button" type="button" onClick={onShare}>
          {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
          {copied ? t(locale, 'action.copied') : t(locale, 'action.share')}
        </button>
        <button className="primary-button" type="button" onClick={onNext}>
          <RefreshCw size={17} aria-hidden="true" />
          {state.mode === 'daily' ? t(locale, 'action.playEndless') : t(locale, 'action.newGame')}
        </button>
      </div>
    </section>
  )
}

export default ResultBanner

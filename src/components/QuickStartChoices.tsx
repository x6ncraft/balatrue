import { Shuffle } from 'lucide-react'

import type { Joker } from '../data/types'
import { t, type Locale } from '../i18n'
import JokerImage from './JokerImage'

export interface QuickStartChoicesProps {
  readonly jokers: readonly Joker[]
  readonly locale: Locale
  readonly onChoose: (joker: Joker) => void
  readonly onShuffle: () => void
}

export function QuickStartChoices({ jokers, locale, onChoose, onShuffle }: QuickStartChoicesProps) {
  const primaryName = (joker: Joker): string =>
    locale === 'zh-CN' ? joker.name.zhCN : joker.name.en

  return (
    <section className="quick-start" aria-labelledby="quick-start-title">
      <div className="quick-start__head">
        <p id="quick-start-title">{t(locale, 'quickStart.title')}</p>
        <button
          className="quick-start__shuffle"
          type="button"
          aria-label={t(locale, 'quickStart.shuffleLabel')}
          onClick={onShuffle}
        >
          <Shuffle size={14} aria-hidden="true" />
          {t(locale, 'quickStart.shuffle')}
        </button>
      </div>
      <div className="quick-start__cards">
        {jokers.map((joker) => {
          const name = primaryName(joker)
          return (
            <button
              key={joker.id}
              className="quick-start__card"
              type="button"
              aria-label={t(locale, 'quickStart.play', { name })}
              onClick={() => onChoose(joker)}
            >
              <JokerImage
                joker={joker}
                alt=""
                fallbackLabel={t(locale, 'error.imageUnavailable')}
                width="38"
                height="51"
              />
              <span>{name}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default QuickStartChoices

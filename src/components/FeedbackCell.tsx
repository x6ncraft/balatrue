import type { CSSProperties } from 'react'

import type { Direction, MatchResult } from '../game/types'
import { t, type Locale } from '../i18n'

export interface FeedbackCellProps {
  readonly label: string
  readonly value: string
  readonly result: MatchResult
  readonly direction?: Direction | null
  readonly cellIndex: number
  readonly locale: Locale
}

export function FeedbackCell({
  label,
  value,
  result,
  direction,
  cellIndex,
  locale,
}: FeedbackCellProps) {
  const statusIcon = result === 'exact' ? '✓' : result === 'partial' ? '◐' : '×'
  const statusText = t(locale, `feedback.${result}`)
  const directionIcon = direction === 'up' ? '↑' : '↓'
  const directionText =
    direction === 'up' ? t(locale, 'feedback.higher') : t(locale, 'feedback.lower')
  const separator = locale === 'zh-CN' ? '，' : ', '
  const labelSeparator = locale === 'zh-CN' ? '：' : ': '
  const accessibleLabel = [
    `${label}${labelSeparator}${value}`,
    statusText,
    ...(direction ? [directionText] : []),
  ].join(separator)
  const style = { '--cell-index': cellIndex } as CSSProperties

  return (
    <div
      className={`feedback-cell feedback-cell--${result}`}
      style={style}
      aria-label={accessibleLabel}
    >
      <span className="feedback-cell__mobile-label" aria-hidden="true">
        {label}
      </span>
      <span className="feedback-cell__status" title={statusText} aria-hidden="true">
        {statusIcon}
      </span>
      <span
        className={`feedback-cell__readout${
          direction ? ' feedback-cell__readout--directional' : ''
        }`}
      >
        <span className="feedback-cell__value">{value}</span>
        {direction ? (
          <span className="feedback-cell__direction" aria-hidden="true">
            {directionIcon}
          </span>
        ) : null}
      </span>
    </div>
  )
}

export default FeedbackCell

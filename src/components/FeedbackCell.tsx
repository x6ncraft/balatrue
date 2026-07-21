import type { CSSProperties } from 'react'

import type { Direction, MatchResult } from '../game/types'
import { t, type Locale } from '../i18n'

export interface FeedbackCellProps {
  readonly label: string
  readonly value: string
  readonly detail?: string
  readonly accessibleValue?: string
  readonly result: MatchResult
  readonly direction?: Direction | null
  readonly cellIndex: number
  readonly locale: Locale
}

export function FeedbackCell({
  label,
  value,
  detail,
  accessibleValue = value,
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
    `${label}${labelSeparator}${accessibleValue}`,
    statusText,
    ...(detail ? [t(locale, 'feedback.detail', { detail })] : []),
    ...(direction ? [directionText] : []),
  ].join(separator)
  const style = { '--cell-index': cellIndex } as CSSProperties

  return (
    <div
      className={`feedback-cell feedback-cell--${result}${detail ? ' feedback-cell--has-detail' : ''}`}
      style={style}
      role="group"
      aria-label={accessibleLabel}
      title={accessibleValue !== value ? `${label}${labelSeparator}${accessibleValue}` : undefined}
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
      {detail ? (
        <span className="feedback-cell__detail" aria-hidden="true">
          {detail}
        </span>
      ) : null}
    </div>
  )
}

export default FeedbackCell

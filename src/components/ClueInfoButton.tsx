import { CircleHelp } from 'lucide-react'

import { t, type Locale } from '../i18n'
import type { JokerFactKey } from '../ui/joker-facts'

export interface ClueInfoButtonProps {
  readonly section: JokerFactKey
  readonly label: string
  readonly compactLabel?: string
  readonly categoryCount: number
  readonly locale: Locale
  readonly onOpen: (section: JokerFactKey) => void
}

export default function ClueInfoButton({
  section,
  label,
  compactLabel,
  categoryCount,
  locale,
  onOpen,
}: ClueInfoButtonProps) {
  const accessibleLabel = t(locale, 'a11y.openClueGlossary', {
    clue: label,
    count: categoryCount,
  })

  return (
    <button
      className="clue-info-button"
      type="button"
      aria-label={accessibleLabel}
      aria-haspopup="dialog"
      title={accessibleLabel}
      onClick={() => onOpen(section)}
    >
      <span className={compactLabel ? 'clue-info-button__label--full' : undefined}>{label}</span>
      {compactLabel ? (
        <span className="clue-info-button__label--compact" aria-hidden="true">
          {compactLabel}
        </span>
      ) : null}
      <CircleHelp size={12} aria-hidden="true" />
    </button>
  )
}

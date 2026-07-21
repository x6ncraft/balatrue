import { CircleHelp } from 'lucide-react'

import { t, type Locale } from '../i18n'
import type { JokerFactKey } from '../ui/joker-facts'

export interface ClueInfoButtonProps {
  readonly section: JokerFactKey
  readonly label: string
  readonly categoryCount: number
  readonly locale: Locale
  readonly onOpen: (section: JokerFactKey) => void
}

export default function ClueInfoButton({
  section,
  label,
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
      <span>{label}</span>
      <CircleHelp size={12} aria-hidden="true" />
    </button>
  )
}

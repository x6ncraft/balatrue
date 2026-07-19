import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { t, type Locale } from '../i18n'
import { averageWinningGuesses, type PlayerStats, winRate } from '../state/stats'

export interface StatsDialogProps {
  open: boolean
  locale: Locale
  stats: PlayerStats
  onClose: () => void
}

export default function StatsDialog({ open, locale, stats, onClose }: StatsDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useLayoutEffect(() => {
    if (!open) return

    const returnFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const appShell = document.querySelector<HTMLElement>('.app-shell')
    const shellWasInert = appShell?.hasAttribute('inert') ?? false

    document.body.style.overflow = 'hidden'
    appShell?.setAttribute('inert', '')
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      if (!shellWasInert) appShell?.removeAttribute('inert')
      returnFocus?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function onKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]'),
      ].filter((element) => !element.hasAttribute('disabled') && element.tabIndex >= 0)
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="dialog stats-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-dialog-title"
      >
        <header className="dialog__head">
          <h2 id="stats-dialog-title">{t(locale, 'stats.title')}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={t(locale, 'action.close')}
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="dialog__body">
          <div className="stats-grid">
            <div>
              <strong>{stats.played}</strong>
              <span>{t(locale, 'stats.played')}</span>
            </div>
            <div>
              <strong>{winRate(stats)}%</strong>
              <span>{t(locale, 'stats.winRate')}</span>
            </div>
            <div>
              <strong>{stats.currentStreak}</strong>
              <span>{t(locale, 'stats.currentStreak')}</span>
            </div>
            <div>
              <strong>{stats.maxStreak}</strong>
              <span>{t(locale, 'stats.maxStreak')}</span>
            </div>
            <div>
              <strong>{averageWinningGuesses(stats).toFixed(1)}</strong>
              <span>{t(locale, 'stats.averageGuesses')}</span>
            </div>
          </div>
          <p className="stats-note">{t(locale, 'state.savedLocally')}</p>
        </div>
      </section>
    </div>,
    document.body,
  )
}

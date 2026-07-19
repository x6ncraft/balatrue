import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { t, type Locale } from '../i18n'

export interface HelpDialogProps {
  open: boolean
  locale: Locale
  maxAttempts: number
  onClose: () => void
}

export default function HelpDialog({ open, locale, maxAttempts, onClose }: HelpDialogProps) {
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
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
      >
        <header className="dialog__head">
          <h2 id="help-dialog-title">{t(locale, 'help.title')}</h2>
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
          <p>{t(locale, 'help.intro', { count: maxAttempts })}</p>
          <ol>
            <li>{t(locale, 'game.instructions')}</li>
            <li>{t(locale, 'help.arrow')}</li>
            <li>
              {locale === 'zh-CN'
                ? '稀有度、价格、主效果、触发时机和依赖条件会逐项揭晓。'
                : 'Rarity, price, effect, trigger, and dependencies are revealed after every guess.'}
            </li>
          </ol>
          <div
            className="help-example"
            aria-label={locale === 'zh-CN' ? '反馈图例' : 'Feedback legend'}
          >
            <div className="help-example__exact">
              <strong>✓</strong>
              <small>{t(locale, 'feedback.exact')}</small>
            </div>
            <div className="help-example__partial">
              <strong>◐</strong>
              <small>{t(locale, 'feedback.partial')}</small>
            </div>
            <div className="help-example__miss">
              <strong>×</strong>
              <small>{t(locale, 'feedback.miss')}</small>
            </div>
          </div>
          <p>{t(locale, 'help.partial')}</p>
        </div>
      </section>
    </div>,
    document.body,
  )
}

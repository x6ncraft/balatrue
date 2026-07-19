import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { JOKER_EFFECTS, JOKER_RARITIES, type Joker } from '../data/types'
import { GAME_DEPENDENCY_FAMILIES, GAME_TIMINGS, projectJokerDependencies } from '../game'
import { t, type Locale } from '../i18n'
import {
  dependencyFamilyDescription,
  dependencyFamilyLabel,
  effectDescription,
  effectLabel,
  gameDependencyDetailLabel,
  rarityDescription,
  rarityLabel,
  timingDescription,
  timingLabel,
} from '../ui/labels'

export interface ClueGlossaryDialogProps {
  open: boolean
  locale: Locale
  jokers: readonly Joker[]
  onClose: () => void
}

export default function ClueGlossaryDialog({
  open,
  locale,
  jokers,
  onClose,
}: ClueGlossaryDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)

  const timingEntries = useMemo(
    () =>
      GAME_TIMINGS.map((timing) => ({
        id: timing,
        label: timingLabel(timing, locale),
        description: timingDescription(timing, locale),
      })),
    [locale],
  )

  const rarityEntries = useMemo(
    () =>
      JOKER_RARITIES.map((rarity, index) => ({
        id: rarity,
        rank: index + 1,
        label: rarityLabel(rarity, locale),
        description: rarityDescription(rarity, locale),
      })),
    [locale],
  )

  const effectEntries = useMemo(
    () =>
      JOKER_EFFECTS.map((effect) => ({
        id: effect,
        label: effectLabel(effect, locale),
        description: effectDescription(effect, locale),
      })),
    [locale],
  )

  const shopPrices = useMemo(
    () =>
      [
        ...new Set(
          jokers.flatMap((joker) =>
            joker.official.shopPurchasable && joker.official.cost !== null
              ? [joker.official.cost]
              : [],
          ),
        ),
      ].sort((left, right) => left - right),
    [jokers],
  )

  const dependencyEntries = useMemo(
    () =>
      GAME_DEPENDENCY_FAMILIES.map((family) => {
        const values = jokers.flatMap((joker) =>
          projectJokerDependencies(joker).flatMap((dependency) =>
            dependency.family === family && dependency.value ? [dependency.value] : [],
          ),
        )
        const uniqueValues = [...new Set(values)].sort((left, right) =>
          gameDependencyDetailLabel(left, locale).localeCompare(
            gameDependencyDetailLabel(right, locale),
            locale,
          ),
        )

        return {
          id: family,
          label: dependencyFamilyLabel(family, locale),
          description: dependencyFamilyDescription(family, locale),
          values: uniqueValues,
        }
      }),
    [jokers, locale],
  )

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
      className="dialog-backdrop glossary-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="dialog clue-glossary-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clue-glossary-title"
      >
        <header className="dialog__head">
          <div>
            <p className="dialog__kicker">{t(locale, 'glossary.kicker')}</p>
            <h2 id="clue-glossary-title">{t(locale, 'glossary.title')}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={t(locale, 'action.close')}
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="dialog__body glossary-body">
          <p className="glossary-intro">{t(locale, 'glossary.intro')}</p>

          <section aria-labelledby="rarity-glossary-title">
            <div className="glossary-section__head">
              <h3 id="rarity-glossary-title">{t(locale, 'clue.rarity')}</h3>
              <span>{rarityEntries.length}</span>
            </div>
            <div className="glossary-grid glossary-grid--rarity">
              {rarityEntries.map((entry) => (
                <article key={entry.id} className="glossary-entry">
                  <div className="glossary-entry__title">
                    <strong>{entry.label}</strong>
                    <small>
                      {entry.rank} / {rarityEntries.length}
                    </small>
                  </div>
                  <p>{entry.description}</p>
                </article>
              ))}
            </div>
            <p className="glossary-hint">{t(locale, 'glossary.rarityHint')}</p>
          </section>

          <section aria-labelledby="price-glossary-title">
            <div className="glossary-section__head">
              <h3 id="price-glossary-title">{t(locale, 'clue.price')}</h3>
              <span>2</span>
            </div>
            <div className="glossary-grid">
              <article className="glossary-entry">
                <strong>{t(locale, 'glossary.shopPrice')}</strong>
                <p>{t(locale, 'glossary.shopPriceDescription')}</p>
                <ul className="glossary-values">
                  {shopPrices.map((price) => (
                    <li key={price}>${price}</li>
                  ))}
                </ul>
              </article>
              <article className="glossary-entry">
                <strong>{t(locale, 'collection.soul')}</strong>
                <p>{t(locale, 'glossary.soulDescription')}</p>
              </article>
            </div>
          </section>

          <section aria-labelledby="effect-glossary-title">
            <div className="glossary-section__head">
              <h3 id="effect-glossary-title">{t(locale, 'clue.effect')}</h3>
              <span>{effectEntries.length}</span>
            </div>
            <div className="glossary-grid glossary-grid--timing">
              {effectEntries.map((entry) => (
                <article key={entry.id} className="glossary-entry">
                  <strong>{entry.label}</strong>
                  <p>{entry.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="timing-glossary-title">
            <div className="glossary-section__head">
              <h3 id="timing-glossary-title">{t(locale, 'clue.timing')}</h3>
              <span>{timingEntries.length}</span>
            </div>
            <div className="glossary-grid glossary-grid--timing">
              {timingEntries.map((entry) => (
                <article key={entry.id} className="glossary-entry">
                  <strong>{entry.label}</strong>
                  <p>{entry.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="dependency-glossary-title">
            <div className="glossary-section__head">
              <h3 id="dependency-glossary-title">{t(locale, 'clue.dependency')}</h3>
              <span>{dependencyEntries.length}</span>
            </div>
            <div className="glossary-grid">
              {dependencyEntries.map((entry) => (
                <article key={entry.id} className="glossary-entry">
                  <strong>{entry.label}</strong>
                  <p>{entry.description}</p>
                  {entry.values.length > 0 && (
                    <ul className="glossary-values">
                      {entry.values.map((value) => (
                        <li key={value}>{gameDependencyDetailLabel(value, locale)}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>

          <p className="classification-note">{t(locale, 'glossary.note')}</p>
        </div>
      </section>
    </div>,
    document.body,
  )
}

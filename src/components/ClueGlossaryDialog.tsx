import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { JOKER_EFFECTS, JOKER_RARITIES, type Joker } from '../data/types'
import {
  GAME_DEPENDENCY_FAMILIES,
  GAME_EFFECT_BEHAVIORS,
  GAME_EFFECT_CATEGORIES,
  GAME_TIMING_FAMILIES,
  gameEffectCategory,
  projectJokerDependencies,
  projectJokerEffectCategories,
  projectJokerEffectBehaviors,
  projectJokerTimingFamilies,
} from '../game'
import { t, type Locale } from '../i18n'
import {
  dependencyFamilyDescription,
  dependencyFamilyLabel,
  dependencySourceLabel,
  effectBehaviorDescription,
  effectBehaviorLabel,
  effectCategoryDescription,
  effectCategoryLabel,
  effectMechanismLabel,
  gameDependencyDetailLabel,
  rarityDescription,
  rarityLabel,
  timingFamilyDescription,
  timingFamilyLabel,
} from '../ui/labels'
import type { JokerFactKey } from '../ui/joker-facts'

export interface ClueGlossaryDialogProps {
  open: boolean
  locale: Locale
  jokers: readonly Joker[]
  initialSection?: JokerFactKey
  onClose: () => void
}

export default function ClueGlossaryDialog({
  open,
  locale,
  jokers,
  initialSection,
  onClose,
}: ClueGlossaryDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const sectionHeadingRefs = useRef<Partial<Record<JokerFactKey, HTMLHeadingElement | null>>>({})
  const onCloseRef = useRef(onClose)

  const timingEntries = useMemo(
    () =>
      GAME_TIMING_FAMILIES.map((family) => ({
        id: family,
        label: timingFamilyLabel(family, locale),
        description: timingFamilyDescription(family, locale),
        count: jokers.filter((joker) => projectJokerTimingFamilies(joker).includes(family)).length,
      })),
    [jokers, locale],
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
      GAME_EFFECT_CATEGORIES.map((category) => ({
        id: category,
        label: effectCategoryLabel(category, locale),
        description: effectCategoryDescription(category, locale),
        values: JOKER_EFFECTS.filter((effect) => gameEffectCategory(effect) === category),
        count: jokers.filter((joker) => projectJokerEffectCategories(joker).includes(category))
          .length,
      })),
    [jokers, locale],
  )

  const effectBehaviorEntries = useMemo(
    () =>
      GAME_EFFECT_BEHAVIORS.map((behavior) => ({
        id: behavior,
        label: effectBehaviorLabel(behavior, locale),
        description: effectBehaviorDescription(behavior, locale),
        count: jokers.filter((joker) => projectJokerEffectBehaviors(joker).includes(behavior))
          .length,
      })),
    [jokers, locale],
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
        const groupedValues = new Map<string, string[]>()
        for (const value of new Set(values)) {
          const separatorIndex = value.indexOf(':')
          const source = separatorIndex === -1 ? value : value.slice(0, separatorIndex)
          groupedValues.set(source, [...(groupedValues.get(source) ?? []), value])
        }
        const groups = [...groupedValues.entries()]
          .map(([source, sourceValues]) => ({
            id: source,
            label: dependencySourceLabel(source, locale, family),
            values: sourceValues.sort((left, right) =>
              gameDependencyDetailLabel(left, locale).localeCompare(
                gameDependencyDetailLabel(right, locale),
                locale,
              ),
            ),
          }))
          .sort((left, right) => left.label.localeCompare(right.label, locale))

        return {
          id: family,
          label: dependencyFamilyLabel(family, locale),
          description: dependencyFamilyDescription(family, locale),
          groups,
          count: jokers.filter((joker) =>
            projectJokerDependencies(joker).some((dependency) => dependency.family === family),
          ).length,
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

  useLayoutEffect(() => {
    if (!open || !initialSection) return
    const heading = sectionHeadingRefs.current[initialSection]
    if (!heading) return
    const section = heading.closest('section')
    heading.focus({ preventScroll: true })
    section?.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [initialSection, open])

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
      if (
        document.activeElement instanceof HTMLElement &&
        dialogRef.current.contains(document.activeElement) &&
        !focusable.includes(document.activeElement)
      ) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
        return
      }
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

        <div ref={bodyRef} className="dialog__body glossary-body">
          <p className="glossary-intro">{t(locale, 'glossary.intro')}</p>

          <section
            aria-labelledby="rarity-glossary-title"
            data-targeted={initialSection === 'rarity' || undefined}
          >
            <div className="glossary-section__head">
              <h3
                ref={(node) => {
                  sectionHeadingRefs.current.rarity = node
                }}
                id="rarity-glossary-title"
                tabIndex={-1}
              >
                {t(locale, 'clue.rarity')}
              </h3>
              <span>{t(locale, 'glossary.categoryCount', { count: rarityEntries.length })}</span>
            </div>
            <div className="glossary-grid glossary-grid--rarity">
              {rarityEntries.map((entry) => (
                <article key={entry.id} className="glossary-entry" aria-label={entry.label}>
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

          <section
            aria-labelledby="price-glossary-title"
            data-targeted={initialSection === 'price' || undefined}
          >
            <div className="glossary-section__head">
              <h3
                ref={(node) => {
                  sectionHeadingRefs.current.price = node
                }}
                id="price-glossary-title"
                tabIndex={-1}
              >
                {t(locale, 'clue.price')}
              </h3>
              <span>{t(locale, 'glossary.categoryCount', { count: 2 })}</span>
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

          <section
            aria-labelledby="effect-glossary-title"
            data-targeted={initialSection === 'effect' || undefined}
          >
            <div className="glossary-section__head">
              <h3
                ref={(node) => {
                  sectionHeadingRefs.current.effect = node
                }}
                id="effect-glossary-title"
                tabIndex={-1}
              >
                {t(locale, 'clue.effect')}
              </h3>
              <span>{t(locale, 'glossary.categoryCount', { count: effectEntries.length })}</span>
            </div>
            <div className="glossary-grid glossary-grid--timing">
              {effectEntries.map((entry) => (
                <article key={entry.id} className="glossary-entry" aria-label={entry.label}>
                  <div className="glossary-entry__title">
                    <strong>{entry.label}</strong>
                    <small>{t(locale, 'glossary.jokerCount', { count: entry.count })}</small>
                  </div>
                  <p>{entry.description}</p>
                  {entry.values.length > 0 && (
                    <ul className="glossary-values">
                      {entry.values.map((value) => (
                        <li key={value}>{effectMechanismLabel(value, locale)}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
            <div className="glossary-section__head">
              <h4>{t(locale, 'glossary.effectBehaviors')}</h4>
              <span>
                {t(locale, 'glossary.categoryCount', { count: effectBehaviorEntries.length })}
              </span>
            </div>
            <p className="glossary-hint">{t(locale, 'glossary.effectBehaviorsDescription')}</p>
            <div className="glossary-grid glossary-grid--timing">
              {effectBehaviorEntries.map((entry) => (
                <article key={entry.id} className="glossary-entry" aria-label={entry.label}>
                  <div className="glossary-entry__title">
                    <strong>{entry.label}</strong>
                    <small>{t(locale, 'glossary.jokerCount', { count: entry.count })}</small>
                  </div>
                  <p>{entry.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="timing-glossary-title"
            data-targeted={initialSection === 'timing' || undefined}
          >
            <div className="glossary-section__head">
              <h3
                ref={(node) => {
                  sectionHeadingRefs.current.timing = node
                }}
                id="timing-glossary-title"
                tabIndex={-1}
              >
                {t(locale, 'clue.timing')}
              </h3>
              <span>{t(locale, 'glossary.categoryCount', { count: timingEntries.length })}</span>
            </div>
            <div className="glossary-grid glossary-grid--timing">
              {timingEntries.map((entry) => (
                <article key={entry.id} className="glossary-entry" aria-label={entry.label}>
                  <div className="glossary-entry__title">
                    <strong>{entry.label}</strong>
                    <small>{t(locale, 'glossary.jokerCount', { count: entry.count })}</small>
                  </div>
                  <p>{entry.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="dependency-glossary-title"
            data-targeted={initialSection === 'dependency' || undefined}
          >
            <div className="glossary-section__head">
              <h3
                ref={(node) => {
                  sectionHeadingRefs.current.dependency = node
                }}
                id="dependency-glossary-title"
                tabIndex={-1}
              >
                {t(locale, 'clue.dependency')}
              </h3>
              <span>
                {t(locale, 'glossary.categoryCount', { count: dependencyEntries.length })}
              </span>
            </div>
            <div className="glossary-grid">
              {dependencyEntries.map((entry) => (
                <article key={entry.id} className="glossary-entry" aria-label={entry.label}>
                  <div className="glossary-entry__title">
                    <strong>{entry.label}</strong>
                    <small>{t(locale, 'glossary.jokerCount', { count: entry.count })}</small>
                  </div>
                  <p>{entry.description}</p>
                  {entry.groups.length > 0 ? (
                    <div className="glossary-detail-groups">
                      {entry.groups.map((group) => (
                        <div key={group.id} className="glossary-detail-group">
                          <span>{group.label}</span>
                          <ul className="glossary-values">
                            {group.values.map((value) => (
                              <li key={value}>{gameDependencyDetailLabel(value, locale)}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : null}
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

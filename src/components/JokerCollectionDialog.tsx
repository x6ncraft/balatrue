import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BookOpen, Search, ShieldAlert, SlidersHorizontal, X } from 'lucide-react'

import { JOKER_RARITIES, type Joker, type JokerRarity } from '../data/types'
import {
  GAME_DEPENDENCY_FAMILIES,
  GAME_EFFECT_CATEGORIES,
  GAME_TIMING_FAMILIES,
  getJokerDependencies,
  getJokerEffectCategories,
  getJokerEffectDetails,
  getJokerTimingFamilies,
  type GameDependencyFamily,
  type GameEffectCategory,
  type GameTimingFamily,
} from '../game'
import { t, type Locale } from '../i18n'
import { searchJokers, type JokerSearchIndex } from '../search'
import {
  dependencyFamilyLabel,
  dependenciesLabel,
  effectCategoryLabel,
  effectDetailsLabel,
  rarityLabel,
  timingFamiliesLabel,
  timingFamilyLabel,
} from '../ui/labels'
import { jokerPriceLabel } from '../ui/joker-facts'
import JokerImage from './JokerImage'

export interface JokerCollectionDialogProps {
  open: boolean
  locale: Locale
  jokers: readonly Joker[]
  searchIndex: JokerSearchIndex
  requiresConfirmation: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function JokerCollectionDialog({
  open,
  locale,
  jokers,
  searchIndex,
  requiresConfirmation,
  onClose,
  onConfirm,
}: JokerCollectionDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  const previousRequiresConfirmationRef = useRef(requiresConfirmation)
  const [query, setQuery] = useState('')
  const [rarityFilter, setRarityFilter] = useState<JokerRarity | ''>('')
  const [effectFilter, setEffectFilter] = useState<GameEffectCategory | ''>('')
  const [timingFilter, setTimingFilter] = useState<GameTimingFamily | ''>('')
  const [dependencyFilter, setDependencyFilter] = useState<GameDependencyFamily | ''>('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const matchingIds = useMemo<Set<string> | null>(() => {
    if (!query.trim()) return null
    return new Set(
      searchJokers(searchIndex, query, {
        locale,
        limit: jokers.length,
      }).map((option) => option.id),
    )
  }, [jokers.length, locale, query, searchIndex])

  const filteredJokers = useMemo(
    () =>
      [...jokers]
        .filter((joker) => matchingIds === null || matchingIds.has(joker.id))
        .filter((joker) => !rarityFilter || joker.official.rarity === rarityFilter)
        .filter((joker) => !effectFilter || getJokerEffectCategories(joker).includes(effectFilter))
        .filter((joker) => !timingFilter || getJokerTimingFamilies(joker).includes(timingFilter))
        .filter(
          (joker) =>
            !dependencyFilter ||
            getJokerDependencies(joker).some(
              (dependency) => dependency.family === dependencyFilter,
            ),
        )
        .sort((left, right) => left.number - right.number),
    [dependencyFilter, effectFilter, jokers, matchingIds, rarityFilter, timingFilter],
  )

  const activeFilterCount = [rarityFilter, effectFilter, timingFilter, dependencyFilter].filter(
    Boolean,
  ).length
  const hasActiveCriteria = query.trim().length > 0 || activeFilterCount > 0

  function primaryName(joker: Joker): string {
    return locale === 'zh-CN' ? joker.name.zhCN : joker.name.en
  }

  function secondaryName(joker: Joker): string {
    return locale === 'zh-CN' ? joker.name.en : joker.name.zhCN
  }

  function resetFilters(): void {
    setQuery('')
    setRarityFilter('')
    setEffectFilter('')
    setTimingFilter('')
    setDependencyFilter('')
    requestAnimationFrame(() => searchInputRef.current?.focus())
  }

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
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, [tabindex]',
        ),
      ].filter((element) => {
        const style = window.getComputedStyle(element)
        return (
          !element.hasAttribute('disabled') &&
          element.tabIndex >= 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          element.getClientRects().length > 0
        )
      })
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

  useEffect(() => {
    const previous = previousRequiresConfirmationRef.current
    previousRequiresConfirmationRef.current = requiresConfirmation
    if (open && previous && !requiresConfirmation) searchInputRef.current?.focus()
  }, [open, requiresConfirmation])

  if (!open) return null

  return createPortal(
    <div
      className="dialog-backdrop collection-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="dialog collection-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-dialog-title"
      >
        <header className="dialog__head collection-dialog__head">
          <div>
            <p className="dialog__kicker">BALATRUE DATABASE</p>
            <h2 id="collection-dialog-title">{t(locale, 'collection.title')}</h2>
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

        {requiresConfirmation ? (
          <div className="collection-gate">
            <div className="collection-gate__mark" aria-hidden="true">
              <ShieldAlert size={31} />
            </div>
            <p className="collection-gate__eyebrow">{t(locale, 'collection.warningEyebrow')}</p>
            <h3>{t(locale, 'collection.warningTitle')}</h3>
            <p>{t(locale, 'collection.warningBody')}</p>
            <div className="collection-gate__actions">
              <button className="secondary-button" type="button" onClick={onClose}>
                {t(locale, 'collection.warningCancel')}
              </button>
              <button className="primary-button" type="button" onClick={onConfirm}>
                <BookOpen size={18} aria-hidden="true" />
                {t(locale, 'collection.warningConfirm')}
              </button>
            </div>
          </div>
        ) : (
          <div className="collection-content">
            <div className="collection-toolbar">
              <label className="collection-search">
                <span>{t(locale, 'collection.searchLabel')}</span>
                <span className="collection-search__field">
                  <Search size={18} aria-hidden="true" />
                  <input
                    ref={searchInputRef}
                    value={query}
                    type="search"
                    placeholder={t(locale, 'collection.searchPlaceholder')}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </span>
              </label>

              <button
                className="collection-filter-toggle"
                type="button"
                aria-expanded={filtersOpen}
                aria-controls="collection-filters"
                onClick={() => setFiltersOpen((current) => !current)}
              >
                <SlidersHorizontal size={17} aria-hidden="true" />
                {t(locale, filtersOpen ? 'collection.hideFilters' : 'collection.showFilters')}
                {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
              </button>

              <div id="collection-filters" className="collection-filters" data-open={filtersOpen}>
                <label>
                  <span>{t(locale, 'clue.rarity')}</span>
                  <select
                    value={rarityFilter}
                    onChange={(event) => setRarityFilter(event.target.value as JokerRarity | '')}
                  >
                    <option value="">{t(locale, 'collection.all')}</option>
                    {JOKER_RARITIES.map((rarity) => (
                      <option key={rarity} value={rarity}>
                        {rarityLabel(rarity, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t(locale, 'clue.effect')}</span>
                  <select
                    value={effectFilter}
                    onChange={(event) =>
                      setEffectFilter(event.target.value as GameEffectCategory | '')
                    }
                  >
                    <option value="">{t(locale, 'collection.all')}</option>
                    {GAME_EFFECT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {effectCategoryLabel(category, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t(locale, 'clue.timing')}</span>
                  <select
                    value={timingFilter}
                    onChange={(event) =>
                      setTimingFilter(event.target.value as GameTimingFamily | '')
                    }
                  >
                    <option value="">{t(locale, 'collection.all')}</option>
                    {GAME_TIMING_FAMILIES.map((timing) => (
                      <option key={timing} value={timing}>
                        {timingFamilyLabel(timing, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t(locale, 'clue.dependency')}</span>
                  <select
                    value={dependencyFilter}
                    onChange={(event) =>
                      setDependencyFilter(event.target.value as GameDependencyFamily | '')
                    }
                  >
                    <option value="">{t(locale, 'collection.all')}</option>
                    {GAME_DEPENDENCY_FAMILIES.map((family) => (
                      <option key={family} value={family}>
                        {dependencyFamilyLabel(family, locale)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="collection-summary">
              <span className="collection-summary__count" role="status">
                {t(locale, 'collection.results', { count: filteredJokers.length })}
              </span>
              <span className="collection-summary__note">
                {t(locale, 'collection.classificationNote')}
              </span>
              {hasActiveCriteria ? (
                <button className="collection-clear" type="button" onClick={resetFilters}>
                  <X size={14} aria-hidden="true" />
                  {t(locale, 'collection.clearFilters')}
                </button>
              ) : null}
            </div>

            {filteredJokers.length > 0 ? (
              <div className="collection-grid">
                {filteredJokers.map((joker) => (
                  <article
                    key={joker.id}
                    className="collection-card"
                    aria-label={primaryName(joker)}
                  >
                    <div className="collection-card__identity">
                      <JokerImage
                        joker={joker}
                        alt={t(locale, 'a11y.jokerImage', { name: primaryName(joker) })}
                        fallbackLabel={t(locale, 'error.imageUnavailable')}
                        width={52}
                        height={70}
                        loading="lazy"
                      />
                      <div>
                        <span className="collection-card__number">
                          NO. {String(joker.number).padStart(3, '0')}
                        </span>
                        <h3>{primaryName(joker)}</h3>
                        <p>{secondaryName(joker)}</p>
                      </div>
                    </div>

                    <dl className="collection-card__facts">
                      <div>
                        <dt>{t(locale, 'clue.rarity')}</dt>
                        <dd>{rarityLabel(joker.official.rarity, locale)}</dd>
                      </div>
                      <div>
                        <dt>{t(locale, 'clue.price')}</dt>
                        <dd>{jokerPriceLabel(joker, locale)}</dd>
                      </div>
                      <div>
                        <dt>{t(locale, 'clue.effect')}</dt>
                        <dd>{effectDetailsLabel(getJokerEffectDetails(joker), locale)}</dd>
                      </div>
                      <div>
                        <dt>{t(locale, 'clue.timing')}</dt>
                        <dd>{timingFamiliesLabel(getJokerTimingFamilies(joker), locale)}</dd>
                      </div>
                      <div className="collection-card__wide">
                        <dt>{t(locale, 'clue.dependency')}</dt>
                        <dd>{dependenciesLabel(getJokerDependencies(joker), locale)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <div className="collection-empty">
                <p>{t(locale, 'collection.noResults')}</p>
                <button className="secondary-button" type="button" onClick={resetFilters}>
                  {t(locale, 'collection.clearFilters')}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>,
    document.body,
  )
}

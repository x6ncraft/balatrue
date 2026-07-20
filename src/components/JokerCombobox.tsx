import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Search, X } from 'lucide-react'

import type { Joker } from '../data/types'
import { t, type Locale } from '../i18n'
import { searchJokers, type JokerSearchIndex } from '../search'
import { pickQuickStartJokers } from '../ui/quick-start'
import JokerImage from './JokerImage'
import QuickStartChoices from './QuickStartChoices'

export interface JokerComboboxProps {
  readonly searchIndex: JokerSearchIndex
  readonly locale: Locale
  readonly guessedIds: readonly string[]
  readonly disabled?: boolean
  readonly onSubmit: (joker: Joker) => void
  readonly onInvalid: () => void
}

const LISTBOX_ID = 'joker-suggestions'

export function JokerCombobox({
  searchIndex,
  locale,
  guessedIds,
  disabled = false,
  onSubmit,
  onInvalid,
}: JokerComboboxProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isComposingRef = useRef(false)
  const activeIndexRef = useRef(0)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Joker | null>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const jokerPool = useMemo(() => searchIndex.entries.map((entry) => entry.joker), [searchIndex])
  const [quickChoices, setQuickChoices] = useState(() => pickQuickStartJokers(jokerPool))

  const displayName = useCallback(
    (joker: Joker): string => (locale === 'zh-CN' ? joker.name.zhCN : joker.name.en),
    [locale],
  )
  const inputValue = selected ? displayName(selected) : query
  const options = useMemo(
    () =>
      searchJokers(searchIndex, inputValue, {
        locale,
        guessedIds,
      }),
    [guessedIds, inputValue, locale, searchIndex],
  )
  const activeOption = options[activeIndex]
  const readyToSubmit = selected !== null && !disabled && !guessedIds.includes(selected.id)
  const showQuickStart =
    !disabled && guessedIds.length === 0 && selected === null && query.trim().length === 0

  const updateActiveIndex = useCallback((nextIndex: number): void => {
    activeIndexRef.current = nextIndex
    setActiveIndex(nextIndex)
  }, [])

  const focusInputAfterRender = useCallback((): void => {
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [inputRef])

  const scrollOptionIntoView = useCallback((id: string): void => {
    window.setTimeout(
      () => document.getElementById(`joker-option-${id}`)?.scrollIntoView({ block: 'nearest' }),
      0,
    )
  }, [])

  const choose = useCallback(
    (joker: Joker, optionDisabled: boolean): void => {
      if (optionDisabled || disabled) return
      setSelected(joker)
      setQuery('')
      setOpen(false)
      updateActiveIndex(0)
      focusInputAfterRender()
    },
    [disabled, focusInputAfterRender, updateActiveIndex],
  )

  const clear = useCallback(
    (focus = true): void => {
      setQuery('')
      setSelected(null)
      setOpen(false)
      updateActiveIndex(0)
      if (focus) focusInputAfterRender()
    },
    [focusInputAfterRender, updateActiveIndex],
  )

  const moveActive = useCallback(
    (delta: number): void => {
      if (!options.length) return
      setOpen(true)
      let nextIndex = activeIndexRef.current
      for (let attempts = 0; attempts < options.length; attempts += 1) {
        nextIndex = (nextIndex + delta + options.length) % options.length
        const option = options[nextIndex]
        if (option && !option.disabled) {
          updateActiveIndex(nextIndex)
          scrollOptionIntoView(option.id)
          return
        }
      }
    },
    [options, scrollOptionIntoView, updateActiveIndex],
  )

  const jumpActive = useCallback(
    (fromEnd: boolean): void => {
      if (!options.length) return
      const indexes = fromEnd
        ? Array.from({ length: options.length }, (_, index) => options.length - index - 1)
        : Array.from({ length: options.length }, (_, index) => index)
      const nextIndex = indexes.find((index) => !options[index]?.disabled)
      if (nextIndex === undefined) return

      setOpen(true)
      updateActiveIndex(nextIndex)
      const option = options[nextIndex]
      if (option) scrollOptionIntoView(option.id)
    },
    [options, scrollOptionIntoView, updateActiveIndex],
  )

  const submit = useCallback((): void => {
    if (!selected || disabled || guessedIds.includes(selected.id)) {
      onInvalid()
      inputRef.current?.focus()
      return
    }
    onSubmit(selected)
    clear(false)
  }, [clear, disabled, guessedIds, inputRef, onInvalid, onSubmit, selected])

  const handleAction = useCallback((): void => {
    if (!selected) {
      if (query.trim()) onInvalid()
      inputRef.current?.focus()
      return
    }
    submit()
  }, [inputRef, onInvalid, query, selected, submit])

  const chooseQuickStart = useCallback(
    (joker: Joker): void => {
      if (disabled) return
      onSubmit(joker)
      clear(false)
    },
    [clear, disabled, onSubmit],
  )

  const shuffleQuickStart = useCallback((): void => {
    setQuickChoices((current) =>
      pickQuickStartJokers(
        jokerPool,
        current.map((joker) => joker.id),
      ),
    )
  }, [jokerPool])

  function handleInput(event: ChangeEvent<HTMLInputElement>): void {
    const nextQuery = event.currentTarget.value
    setQuery(nextQuery)
    if (selected && nextQuery !== displayName(selected)) setSelected(null)
    setOpen(nextQuery.trim().length > 0)
    updateActiveIndex(0)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveActive(1)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveActive(-1)
      return
    }
    if (open && event.key === 'Home') {
      event.preventDefault()
      jumpActive(false)
      return
    }
    if (open && event.key === 'End') {
      event.preventDefault()
      jumpActive(true)
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key !== 'Enter' || isComposingRef.current || event.nativeEvent.isComposing) return

    event.preventDefault()
    if (open && activeOption && !activeOption.disabled) {
      choose(activeOption.joker, false)
      return
    }
    submit()
  }

  useEffect(() => {
    let nextIndex = activeIndexRef.current
    if (nextIndex >= options.length) {
      nextIndex = 0
      updateActiveIndex(0)
    }
    if (!options[nextIndex]?.disabled) return

    for (let attempts = 0; attempts < options.length; attempts += 1) {
      nextIndex = (nextIndex + 1) % options.length
      const option = options[nextIndex]
      if (option && !option.disabled) {
        setOpen(true)
        updateActiveIndex(nextIndex)
        scrollOptionIntoView(option.id)
        return
      }
    }
  }, [options, scrollOptionIntoView, updateActiveIndex])

  return (
    <div className="entry-area">
      <div className="play-area">
        <div className="combobox">
          <label className="sr-only" htmlFor="joker-search">
            {t(locale, 'search.label')}
          </label>
          <div className="search-field">
            <Search size={19} aria-hidden="true" />
            <input
              id="joker-search"
              ref={inputRef}
              value={inputValue}
              type="text"
              role="combobox"
              autoComplete="off"
              spellCheck={false}
              placeholder={t(locale, 'search.placeholder')}
              disabled={disabled}
              aria-expanded={open}
              aria-controls={LISTBOX_ID}
              aria-activedescendant={
                open && activeOption ? `joker-option-${activeOption.id}` : undefined
              }
              aria-autocomplete="list"
              aria-describedby="joker-search-hint"
              onChange={handleInput}
              onFocus={() => setOpen(inputValue.trim().length > 0)}
              onBlur={() => setOpen(false)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => {
                isComposingRef.current = true
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false
              }}
            />
            <span id="joker-search-hint" className="sr-only">
              {t(locale, 'search.hint')}
            </span>
            <span className="sr-only" role="status" aria-live="polite">
              {selected ? t(locale, 'search.selected', { name: displayName(selected) }) : ''}
            </span>
            {inputValue ? (
              <button
                className="search-clear"
                type="button"
                aria-label={t(locale, 'search.clear')}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => clear()}
              >
                <X size={17} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {open ? (
            <ul
              id={LISTBOX_ID}
              className="suggestions"
              role="listbox"
              aria-label={t(locale, 'search.results')}
            >
              {options.length === 0 ? (
                <li className="empty-suggestion">{t(locale, 'search.noResults')}</li>
              ) : null}
              {options.map((option, index) => (
                <li
                  id={`joker-option-${option.id}`}
                  key={option.id}
                  className="suggestion"
                  role="option"
                  aria-selected={index === activeIndex}
                  aria-disabled={option.disabled}
                  onMouseEnter={() => updateActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    choose(option.joker, option.disabled)
                  }}
                >
                  <JokerImage
                    className="suggestion__image"
                    joker={option.joker}
                    alt=""
                    fallbackLabel={t(locale, 'error.imageUnavailable')}
                    width="30"
                    height="40"
                    loading="lazy"
                  />
                  <span className="suggestion__name">
                    <strong>{option.primaryName}</strong>
                    <small>{option.secondaryName}</small>
                  </span>
                  {option.disabled ? (
                    <span className="suggestion__status">{t(locale, 'search.alreadyGuessed')}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button
          className="deal-button"
          type="button"
          disabled={disabled}
          data-ready={readyToSubmit}
          onClick={handleAction}
        >
          {t(locale, disabled || readyToSubmit ? 'action.guess' : 'action.chooseJoker')}
        </button>
      </div>

      {showQuickStart ? (
        <QuickStartChoices
          jokers={quickChoices}
          locale={locale}
          onChoose={chooseQuickStart}
          onShuffle={shuffleQuickStart}
        />
      ) : null}
    </div>
  )
}

export default JokerCombobox

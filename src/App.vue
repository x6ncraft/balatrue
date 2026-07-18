<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { BarChart3, CircleHelp, Languages } from 'lucide-vue-next'

import GuessRow from './components/GuessRow.vue'
import HelpDialog from './components/HelpDialog.vue'
import JokerCombobox from './components/JokerCombobox.vue'
import ResultBanner from './components/ResultBanner.vue'
import StatsDialog from './components/StatsDialog.vue'
import { JOKER_DATA_META, jokers } from './data'
import type { Joker } from './data/types'
import {
  compareJokers,
  createDailyGame,
  createPracticeGame,
  deserializeGameState,
  formatShareResult,
  getBeijingDateKey,
  serializeGameState,
  submitGuess,
  type GameMode,
  type GameState,
  type GuessComparison,
} from './game'
import {
  LOCALE_STORAGE_KEY,
  resolveLocale,
  serializeLocalePreference,
  t,
  type Locale,
} from './i18n'
import {
  STATS_STORAGE_KEY,
  parseStats,
  recordCompletedDailyGame,
  type PlayerStats,
} from './state/stats'

const bootTime = new Date()
const today = getBeijingDateKey(bootTime)
const initialDailyGame = createDailyGame(jokers, bootTime)
const dailyAnswer = initialDailyGame.answerId
const dataKey = `${JOKER_DATA_META.gameVersion}:c${JOKER_DATA_META.classificationVersion}`
const dailyStorageKey = `balatrue:game:${dataKey}:daily:${today}`
const practiceStorageKey = `balatrue:game:${dataKey}:practice`
const practiceBagKey = `balatrue:practice-bag:${dataKey}`

function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function restoredGame(key: string, mode: GameMode, answerId?: string): GameState | null {
  try {
    const stored = safeStorageGet(key)
    const state = stored ? deserializeGameState(stored) : null
    if (!state || state.mode !== mode) return null
    if (answerId && state.answerId !== answerId) return null
    if (!jokers.some((joker) => joker.id === state.answerId)) return null
    if (state.guesses.some((guess) => !jokers.some((joker) => joker.id === guess.guessId))) {
      return null
    }
    return state
  } catch {
    return null
  }
}

function shuffledIds(): string[] {
  const result = jokers.map((joker) => joker.id)
  for (let index = result.length - 1; index > 0; index -= 1) {
    const random = new Uint32Array(1)
    crypto.getRandomValues(random)
    const swapIndex = (random[0] ?? 0) % (index + 1)
    const current = result[index]
    const swap = result[swapIndex]
    if (current && swap) {
      result[index] = swap
      result[swapIndex] = current
    }
  }
  return result
}

function nextPracticeGame(): GameState {
  let bag: string[] = []
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(practiceBagKey) ?? '[]')
    if (Array.isArray(stored)) {
      bag = stored.filter(
        (id): id is string => typeof id === 'string' && jokers.some((joker) => joker.id === id),
      )
    }
  } catch {
    bag = []
  }
  if (bag.length === 0) bag = shuffledIds()

  const answerId = bag.shift()
  const sorted = [...jokers].sort((left, right) => left.number - right.number)
  const answerIndex = sorted.findIndex((joker) => joker.id === answerId)
  const randomValue = (Math.max(0, answerIndex) + 0.5) / sorted.length
  try {
    localStorage.setItem(practiceBagKey, JSON.stringify(bag))
  } catch {
    // A private browsing quota should not make practice mode unplayable.
  }

  return createPracticeGame(jokers, () => randomValue, {
    puzzleKey: `practice:${Date.now().toString(36)}`,
  })
}

const locale = ref<Locale>(
  resolveLocale({
    stored: safeStorageGet(LOCALE_STORAGE_KEY),
    preferredLanguages: navigator.languages,
  }),
)
const mode = ref<GameMode>('daily')
const dailyState = ref<GameState>(
  restoredGame(dailyStorageKey, 'daily', dailyAnswer) ?? initialDailyGame,
)
const practiceState = ref<GameState | null>(restoredGame(practiceStorageKey, 'practice'))
const helpOpen = ref(false)
const statsOpen = ref(false)
const notice = ref('')
const copied = ref(false)
const resetToken = ref(0)
const stats = ref<PlayerStats>(parseStats(safeStorageGet(STATS_STORAGE_KEY)))

const state = computed(() =>
  mode.value === 'daily' ? dailyState.value : (practiceState.value ?? nextPracticeGame()),
)
const answer = computed(() => {
  const found = jokers.find((joker) => joker.id === state.value.answerId)
  if (!found) throw new Error(`Missing answer ${state.value.answerId}`)
  return found
})
const guessedIds = computed(() => state.value.guesses.map((guess) => guess.guessId))
const guessRows = computed(() =>
  state.value.guesses.flatMap((comparison) => {
    const joker = jokers.find((candidate) => candidate.id === comparison.guessId)
    return joker ? [{ joker, comparison }] : []
  }),
)
const remainingAttempts = computed(() => state.value.maxAttempts - state.value.guesses.length)

function sameVisibleFeedback(left: GuessComparison, right: GuessComparison): boolean {
  return (
    left.rarity.result === right.rarity.result &&
    left.rarity.direction === right.rarity.direction &&
    left.acquisition.result === right.acquisition.result &&
    left.acquisition.direction === right.acquisition.direction &&
    left.effects.result === right.effects.result &&
    left.timings.result === right.timings.result &&
    left.dependencies.result === right.dependencies.result
  )
}

const possibleCount = computed(() => {
  if (state.value.guesses.length === 0) return jokers.length
  if (state.value.status === 'won') return 1
  const guessed = new Set(guessedIds.value)

  return jokers.filter((candidate) => {
    if (guessed.has(candidate.id)) return false
    return state.value.guesses.every((record) => {
      const guessedJoker = jokers.find((joker) => joker.id === record.guessId)
      return guessedJoker
        ? sameVisibleFeedback(compareJokers(guessedJoker, candidate), record)
        : false
    })
  }).length
})

const formattedDate = computed(() => {
  const [year, month, day] = today.split('-').map(Number)
  return new Intl.DateTimeFormat(locale.value === 'zh-CN' ? 'zh-CN' : 'en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Shanghai',
  }).format(new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1, 12)))
})

function saveState(next: GameState): void {
  const key = next.mode === 'daily' ? dailyStorageKey : practiceStorageKey
  if (!safeStorageSet(key, serializeGameState(next))) {
    notice.value = t(locale.value, 'error.storageUnavailable')
  }
}

function finishDaily(next: GameState): void {
  if (next.mode !== 'daily' || next.status === 'playing') return
  stats.value = recordCompletedDailyGame(stats.value, next)
  if (!safeStorageSet(STATS_STORAGE_KEY, JSON.stringify(stats.value))) {
    notice.value = t(locale.value, 'error.storageUnavailable')
  }
}

async function revealLatestFeedback(next: GameState): Promise<void> {
  await nextTick()
  const target = document.querySelector<HTMLElement>(
    next.status === 'playing' ? '.guess-row:last-child' : '.result-banner',
  )
  if (!target) return
  const bounds = target.getBoundingClientRect()
  if (bounds.top >= 0 && bounds.bottom <= window.innerHeight) return

  const isNarrowScreen = window.matchMedia('(max-width: 760px)').matches
  target.scrollIntoView({
    block: isNarrowScreen ? 'center' : 'nearest',
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
}

function submit(joker: Joker): void {
  notice.value = ''
  try {
    const next = submitGuess(state.value, joker, answer.value)
    if (mode.value === 'daily') dailyState.value = next
    else practiceState.value = next
    saveState(next)
    finishDaily(next)
    resetToken.value += 1
    void revealLatestFeedback(next)
  } catch (error) {
    notice.value =
      error instanceof Error && error.message.includes('already')
        ? t(locale.value, 'error.duplicateGuess')
        : t(locale.value, 'error.invalidGuess')
  }
}

function setMode(next: GameMode): void {
  if (mode.value === next) return
  mode.value = next
  notice.value = ''
  copied.value = false
  resetToken.value += 1
  if (next === 'practice' && !practiceState.value) {
    practiceState.value = nextPracticeGame()
    saveState(practiceState.value)
  }
}

function startNext(): void {
  if (mode.value === 'daily') {
    mode.value = 'practice'
  }
  practiceState.value = nextPracticeGame()
  saveState(practiceState.value)
  notice.value = ''
  copied.value = false
  resetToken.value += 1
}

async function copyResult(): Promise<void> {
  const result = formatShareResult(state.value, {
    title: 'Balatrue',
    url: window.location.origin,
  })
  let didCopy = false
  try {
    await navigator.clipboard.writeText(result)
    didCopy = true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = result
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.append(textarea)
    textarea.select()
    didCopy = document.execCommand('copy')
    textarea.remove()
  }
  if (!didCopy) {
    notice.value = t(locale.value, 'error.generic')
    return
  }
  copied.value = true
  window.setTimeout(() => (copied.value = false), 1800)
}

function toggleLocale(): void {
  locale.value = locale.value === 'zh-CN' ? 'en' : 'zh-CN'
}

watch(locale, (next) => {
  safeStorageSet(LOCALE_STORAGE_KEY, serializeLocalePreference(next))
  document.documentElement.lang = next
  document.title = next === 'zh-CN' ? 'Balatrue · 猜丑牌' : 'Balatrue · Daily Joker Puzzle'
})

onMounted(() => {
  document.documentElement.lang = locale.value
  finishDaily(dailyState.value)
})
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div class="brand" aria-label="Balatrue 猜丑牌">
        <p class="brand__name">BALA<span>TRUE</span></p>
        <p class="brand__zh">猜丑牌</p>
      </div>
      <nav class="top-actions" :aria-label="locale === 'zh-CN' ? '页面工具' : 'Page tools'">
        <button
          class="icon-button"
          type="button"
          :aria-label="t(locale, 'stats.title')"
          @click="statsOpen = true"
        >
          <BarChart3 :size="19" aria-hidden="true" />
        </button>
        <button
          class="icon-button"
          type="button"
          :aria-label="t(locale, 'a11y.openHelp')"
          @click="helpOpen = true"
        >
          <CircleHelp :size="19" aria-hidden="true" />
        </button>
        <button
          class="language-button"
          type="button"
          :aria-label="t(locale, 'a11y.openLanguageMenu')"
          @click="toggleLocale"
        >
          <Languages :size="18" aria-hidden="true" />
          <span>{{ locale === 'zh-CN' ? 'EN' : '中文' }}</span>
        </button>
      </nav>
    </header>

    <section class="game-card" aria-labelledby="puzzle-title">
      <header class="game-card__head">
        <div class="game-heading-row">
          <div class="mode-switch" :aria-label="locale === 'zh-CN' ? '游戏模式' : 'Game mode'">
            <button type="button" :aria-pressed="mode === 'daily'" @click="setMode('daily')">
              {{ t(locale, 'nav.daily') }}
            </button>
            <button type="button" :aria-pressed="mode === 'practice'" @click="setMode('practice')">
              {{ t(locale, 'nav.endless') }}
            </button>
          </div>
          <div>
            <p class="puzzle-kicker">
              {{ mode === 'daily' ? t(locale, 'game.today', { date: formattedDate }) : 'PRACTICE' }}
            </p>
            <h1 id="puzzle-title" class="puzzle-title">
              {{ mode === 'daily' ? t(locale, 'brand.tagline') : t(locale, 'game.endlessTitle') }}
            </h1>
            <p class="puzzle-rule">
              {{ t(locale, 'game.instructions') }}
              {{ t(locale, 'feedback.legend') }}
            </p>
          </div>
        </div>

        <JokerCombobox
          :jokers="jokers"
          :locale="locale"
          :guessed-ids="guessedIds"
          :disabled="state.status !== 'playing'"
          :reset-token="resetToken"
          @submit="submit"
          @invalid="notice = t(locale, 'error.invalidGuess')"
        />

        <div class="game-meta">
          <ul class="legend" :aria-label="locale === 'zh-CN' ? '反馈图例' : 'Feedback legend'">
            <li>
              <span class="legend-dot legend-dot--exact">✓</span>{{ t(locale, 'feedback.exact') }}
            </li>
            <li>
              <span class="legend-dot legend-dot--partial">◐</span
              >{{ t(locale, 'feedback.partial') }}
            </li>
            <li>
              <span class="legend-dot legend-dot--miss">×</span>{{ t(locale, 'feedback.miss') }}
            </li>
          </ul>
          <span>
            {{ t(locale, 'game.remaining', { count: remainingAttempts }) }} ·
            {{
              locale === 'zh-CN'
                ? `约 ${possibleCount} 张仍符合线索`
                : `About ${possibleCount} still fit`
            }}
          </span>
        </div>
        <div v-if="notice" class="notice" role="status">{{ notice }}</div>
      </header>

      <div class="guess-area">
        <ResultBanner
          v-if="state.status !== 'playing'"
          :state="state"
          :answer="answer"
          :locale="locale"
          :copied="copied"
          @share="copyResult"
          @next="startNext"
        />

        <div v-if="guessRows.length === 0" class="empty-board">
          <div>
            <span class="empty-board__mark" aria-hidden="true">?</span>
            <p>
              {{ t(locale, 'state.empty') }}{{ locale === 'zh-CN' ? '。' : '. '
              }}{{ t(locale, 'search.hint') }}
            </p>
          </div>
        </div>
        <section v-else class="guess-table" :aria-label="t(locale, 'a11y.guessHistory')">
          <div class="guess-header" aria-hidden="true">
            <span>{{ t(locale, 'clue.joker') }}</span>
            <span>{{ t(locale, 'clue.rarity') }}</span>
            <span>{{ t(locale, 'clue.price') }}</span>
            <span>{{ t(locale, 'clue.effect') }}</span>
            <span>{{ t(locale, 'clue.timing') }}</span>
            <span>{{ t(locale, 'clue.dependency') }}</span>
          </div>
          <GuessRow
            v-for="row in guessRows"
            :key="row.joker.id"
            :joker="row.joker"
            :comparison="row.comparison"
            :locale="locale"
          />
        </section>
      </div>
    </section>

    <footer class="site-footer">
      <span>{{ t(locale, 'brand.disclaimer') }}</span>
      <span>
        {{ JOKER_DATA_META.gameVersion }} · 150 Jokers ·
        {{ locale === 'zh-CN' ? '进度仅保存在本机' : 'Progress stays on this device' }}
      </span>
    </footer>

    <HelpDialog :open="helpOpen" :locale="locale" @close="helpOpen = false" />
    <StatsDialog :open="statsOpen" :locale="locale" :stats="stats" @close="statsOpen = false" />
  </main>
</template>

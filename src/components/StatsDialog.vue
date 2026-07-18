<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

import { t, type Locale } from '../i18n'
import { averageWinningGuesses, type PlayerStats, winRate } from '../state/stats'

const props = defineProps<{
  open: boolean
  locale: Locale
  stats: PlayerStats
}>()

const emit = defineEmits<{
  close: []
}>()

const closeButton = ref<HTMLButtonElement | null>(null)
const dialog = ref<HTMLElement | null>(null)
let returnFocus: HTMLElement | null = null

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) emit('close')
  if (event.key !== 'Tab' || !props.open || !dialog.value) return

  const focusable = [
    ...dialog.value.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]'),
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

watch(
  () => props.open,
  (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    if (isOpen) {
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      void nextTick(() => closeButton.value?.focus())
    } else {
      returnFocus?.focus()
      returnFocus = null
    }
  },
)

window.addEventListener('keydown', onKeydown)
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-backdrop" @mousedown.self="emit('close')">
      <section
        ref="dialog"
        class="dialog stats-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-dialog-title"
      >
        <header class="dialog__head">
          <h2 id="stats-dialog-title">{{ t(locale, 'stats.title') }}</h2>
          <button
            ref="closeButton"
            type="button"
            :aria-label="t(locale, 'action.close')"
            @click="emit('close')"
          >
            <X :size="20" aria-hidden="true" />
          </button>
        </header>
        <div class="dialog__body">
          <div class="stats-grid">
            <div>
              <strong>{{ stats.played }}</strong>
              <span>{{ t(locale, 'stats.played') }}</span>
            </div>
            <div>
              <strong>{{ winRate(stats) }}%</strong>
              <span>{{ t(locale, 'stats.winRate') }}</span>
            </div>
            <div>
              <strong>{{ stats.currentStreak }}</strong>
              <span>{{ t(locale, 'stats.currentStreak') }}</span>
            </div>
            <div>
              <strong>{{ stats.maxStreak }}</strong>
              <span>{{ t(locale, 'stats.maxStreak') }}</span>
            </div>
            <div>
              <strong>{{ averageWinningGuesses(stats).toFixed(1) }}</strong>
              <span>{{ t(locale, 'stats.averageGuesses') }}</span>
            </div>
          </div>
          <p class="stats-note">{{ t(locale, 'state.savedLocally') }}</p>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.stats-grid > div {
  display: grid;
  min-height: 92px;
  padding: 12px 7px;
  border: 1px solid #d2cabd;
  border-radius: 10px;
  background: #f2eadc;
  text-align: center;
  place-content: center;
}

.stats-grid strong,
.stats-grid span {
  display: block;
}

.stats-grid strong {
  color: #173c36;
  font:
    700 21px/1 'Silkscreen',
    monospace;
}

.stats-grid span {
  margin-top: 7px;
  color: #68736e;
  font-size: 10px;
  line-height: 1.35;
}

.stats-note {
  margin: 15px 0 0;
  color: #77817c;
  font-size: 12px;
  text-align: center;
}

@media (max-width: 560px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stats-grid > div:last-child {
    grid-column: 1 / -1;
  }
}
</style>

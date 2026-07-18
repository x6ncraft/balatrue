<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

import { t, type Locale } from '../i18n'

const props = defineProps<{
  open: boolean
  locale: Locale
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
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
      >
        <header class="dialog__head">
          <h2 id="help-dialog-title">{{ t(locale, 'help.title') }}</h2>
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
          <p>{{ t(locale, 'help.intro') }}</p>
          <ol>
            <li>{{ t(locale, 'game.instructions') }}</li>
            <li>{{ t(locale, 'help.arrow') }}</li>
            <li>
              {{
                locale === 'zh-CN'
                  ? '稀有度、价格、主效果、生效时点和依赖条件会逐项揭晓。'
                  : 'Rarity, price, effect, trigger, and condition are revealed after every guess.'
              }}
            </li>
          </ol>
          <div
            class="help-example"
            :aria-label="locale === 'zh-CN' ? '反馈图例' : 'Feedback legend'"
          >
            <div class="help-example__exact">
              <strong>✓</strong>
              <small>{{ t(locale, 'feedback.exact') }}</small>
            </div>
            <div class="help-example__partial">
              <strong>◐</strong>
              <small>{{ t(locale, 'feedback.partial') }}</small>
            </div>
            <div class="help-example__miss">
              <strong>×</strong>
              <small>{{ t(locale, 'feedback.miss') }}</small>
            </div>
          </div>
          <p>{{ t(locale, 'help.partial') }}</p>
        </div>
      </section>
    </div>
  </Teleport>
</template>

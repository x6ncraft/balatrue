<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Search, X } from 'lucide-vue-next'

import type { Joker } from '../data/types'
import { t, type Locale } from '../i18n'
import { buildJokerSearchIndex, searchJokers } from '../search'

const props = defineProps<{
  jokers: readonly Joker[]
  locale: Locale
  guessedIds: readonly string[]
  disabled?: boolean
  resetToken?: number
}>()

const emit = defineEmits<{
  submit: [joker: Joker]
  invalid: []
}>()

const input = ref<HTMLInputElement | null>(null)
const query = ref('')
const selected = ref<Joker | null>(null)
const open = ref(false)
const activeIndex = ref(0)
const isComposing = ref(false)
const searchIndex = computed(() => buildJokerSearchIndex(props.jokers))
const options = computed(() =>
  searchJokers(searchIndex.value, query.value, {
    locale: props.locale,
    guessedIds: props.guessedIds,
    limit: 8,
  }),
)

const activeOption = computed(() => options.value[activeIndex.value])
const listboxId = 'joker-suggestions'

function displayName(joker: Joker): string {
  return props.locale === 'zh-CN' ? joker.name.zhCN : joker.name.en
}

function choose(joker: Joker, disabled: boolean): void {
  if (disabled || props.disabled) return
  selected.value = joker
  query.value = displayName(joker)
  open.value = false
  activeIndex.value = 0
  void nextTick(() => input.value?.focus())
}

function clear(focus = true): void {
  query.value = ''
  selected.value = null
  open.value = false
  activeIndex.value = 0
  if (focus) void nextTick(() => input.value?.focus())
}

function onInput(): void {
  if (selected.value && query.value !== displayName(selected.value)) selected.value = null
  open.value = query.value.trim().length > 0
  activeIndex.value = 0
}

function moveActive(delta: number): void {
  if (!options.value.length) return
  open.value = true
  let next = activeIndex.value
  for (let attempts = 0; attempts < options.value.length; attempts += 1) {
    next = (next + delta + options.value.length) % options.value.length
    if (!options.value[next]?.disabled) {
      activeIndex.value = next
      void nextTick(() =>
        document
          .getElementById(`joker-option-${options.value[next]?.id}`)
          ?.scrollIntoView({ block: 'nearest' }),
      )
      return
    }
  }
}

function onKeydown(event: KeyboardEvent): void {
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
  if (event.key === 'Escape') {
    open.value = false
    return
  }
  if (event.key !== 'Enter' || isComposing.value) return

  event.preventDefault()
  if (open.value && activeOption.value && !activeOption.value.disabled) {
    choose(activeOption.value.joker, false)
    return
  }
  submit()
}

function submit(): void {
  if (!selected.value || props.disabled || props.guessedIds.includes(selected.value.id)) {
    emit('invalid')
    input.value?.focus()
    return
  }
  emit('submit', selected.value)
}

watch(
  () => props.locale,
  () => {
    if (selected.value) query.value = displayName(selected.value)
  },
)

watch(
  () => props.resetToken,
  () => clear(false),
)

watch(options, (nextOptions) => {
  if (activeIndex.value >= nextOptions.length) activeIndex.value = 0
  if (nextOptions[activeIndex.value]?.disabled) moveActive(1)
})
</script>

<template>
  <div class="play-area">
    <div class="combobox">
      <label class="sr-only" for="joker-search">{{ t(locale, 'search.label') }}</label>
      <div class="search-field">
        <Search :size="19" aria-hidden="true" />
        <input
          id="joker-search"
          ref="input"
          v-model="query"
          type="text"
          role="combobox"
          autocomplete="off"
          spellcheck="false"
          :placeholder="t(locale, 'search.placeholder')"
          :disabled="disabled"
          :aria-expanded="open"
          :aria-controls="listboxId"
          :aria-activedescendant="
            open && activeOption ? `joker-option-${activeOption.id}` : undefined
          "
          aria-autocomplete="list"
          @input="onInput"
          @focus="open = query.trim().length > 0"
          @blur="open = false"
          @keydown="onKeydown"
          @compositionstart="isComposing = true"
          @compositionend="isComposing = false"
        />
        <button
          v-if="query"
          class="search-clear"
          type="button"
          :aria-label="t(locale, 'search.clear')"
          @mousedown.prevent
          @click="clear()"
        >
          <X :size="17" aria-hidden="true" />
        </button>
      </div>

      <ul
        v-if="open"
        :id="listboxId"
        class="suggestions"
        role="listbox"
        :aria-label="t(locale, 'search.results')"
      >
        <li v-if="options.length === 0" class="empty-suggestion">
          {{ t(locale, 'search.noResults') }}
        </li>
        <li
          v-for="(option, index) in options"
          :id="`joker-option-${option.id}`"
          :key="option.id"
          class="suggestion"
          role="option"
          :aria-selected="index === activeIndex"
          :aria-disabled="option.disabled"
          @mouseenter="activeIndex = index"
          @mousedown.prevent="choose(option.joker, option.disabled)"
        >
          <img
            class="suggestion__image"
            :src="option.joker.imagePath"
            :alt="''"
            width="30"
            height="40"
          />
          <span class="suggestion__name">
            <strong>{{ option.primaryName }}</strong>
            <small>{{ option.secondaryName }}</small>
          </span>
          <span v-if="option.disabled" class="suggestion__status">
            {{ t(locale, 'search.alreadyGuessed') }}
          </span>
        </li>
      </ul>
    </div>

    <button class="deal-button" type="button" :disabled="disabled" @click="submit">
      {{ t(locale, 'action.guess') }}
    </button>
  </div>
</template>

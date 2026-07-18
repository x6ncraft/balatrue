<script setup lang="ts">
import { computed } from 'vue'

import type { Direction, MatchResult } from '../game/types'
import { t, type Locale } from '../i18n'

const props = defineProps<{
  label: string
  value: string
  result: MatchResult
  direction?: Direction | null
  cellIndex: number
  locale: Locale
}>()

const statusIcon = computed(() => {
  if (props.result === 'exact') return '✓'
  if (props.result === 'partial') return '◐'
  return '×'
})

const statusText = computed(() => t(props.locale, `feedback.${props.result}`))
const directionIcon = computed(() => (props.direction === 'up' ? '↑' : '↓'))
const directionText = computed(() =>
  props.direction === 'up' ? t(props.locale, 'feedback.higher') : t(props.locale, 'feedback.lower'),
)
const accessibleLabel = computed(() => {
  const separator = props.locale === 'zh-CN' ? '，' : ', '
  const labelSeparator = props.locale === 'zh-CN' ? '：' : ': '
  return [
    `${props.label}${labelSeparator}${props.value}`,
    statusText.value,
    ...(props.direction ? [directionText.value] : []),
  ].join(separator)
})
</script>

<template>
  <div
    class="feedback-cell"
    :class="`feedback-cell--${result}`"
    :style="{ '--cell-index': cellIndex }"
    :aria-label="accessibleLabel"
  >
    <span class="feedback-cell__mobile-label" aria-hidden="true">{{ label }}</span>
    <span class="feedback-cell__status" :title="statusText" aria-hidden="true">
      {{ statusIcon }}
    </span>
    <span class="feedback-cell__value">{{ value }}</span>
    <span v-if="direction" class="feedback-cell__direction" aria-hidden="true">
      {{ directionIcon }}
    </span>
  </div>
</template>

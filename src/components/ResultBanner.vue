<script setup lang="ts">
import { computed } from 'vue'
import { Check, Copy, RefreshCw } from 'lucide-vue-next'

import type { Joker } from '../data/types'
import type { GameState } from '../game/types'
import { t, type Locale } from '../i18n'

const props = defineProps<{
  state: GameState
  answer: Joker
  locale: Locale
  copied: boolean
}>()

const emit = defineEmits<{
  share: []
  next: []
}>()

const won = computed(() => props.state.status === 'won')
const primaryName = computed(() =>
  props.locale === 'zh-CN' ? props.answer.name.zhCN : props.answer.name.en,
)
const secondaryName = computed(() =>
  props.locale === 'zh-CN' ? props.answer.name.en : props.answer.name.zhCN,
)
</script>

<template>
  <section class="result-banner" :class="{ 'result-banner--won': won }" aria-live="polite">
    <img
      :src="answer.imagePath"
      :alt="t(locale, 'a11y.jokerImage', { name: primaryName })"
      width="70"
      height="94"
    />
    <div class="result-banner__copy">
      <p class="result-banner__eyebrow">
        {{ won ? t(locale, 'result.winTitle') : t(locale, 'result.lossTitle') }}
      </p>
      <h2>{{ primaryName }}</h2>
      <p>
        {{ secondaryName }} ·
        {{
          won
            ? t(locale, 'result.winMessage', { count: state.guesses.length })
            : t(locale, 'result.lossMessage', { name: primaryName })
        }}
      </p>
      <p v-if="state.mode === 'daily' && state.usedCollection" class="result-banner__assisted">
        {{ t(locale, 'game.assisted') }}
      </p>
    </div>
    <div class="result-banner__actions">
      <button class="secondary-button" type="button" @click="emit('share')">
        <Check v-if="copied" :size="17" aria-hidden="true" />
        <Copy v-else :size="17" aria-hidden="true" />
        {{ copied ? t(locale, 'action.copied') : t(locale, 'action.share') }}
      </button>
      <button class="primary-button" type="button" @click="emit('next')">
        <RefreshCw :size="17" aria-hidden="true" />
        {{ state.mode === 'daily' ? t(locale, 'action.playEndless') : t(locale, 'action.newGame') }}
      </button>
    </div>
  </section>
</template>

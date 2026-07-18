<script setup lang="ts">
import { computed } from 'vue'

import type { Joker } from '../data/types'
import type { GuessComparison } from '../game/types'
import { t, type Locale } from '../i18n'
import { dependencyLabel, effectLabel, listLabel, rarityLabel, timingLabel } from '../ui/labels'
import FeedbackCell from './FeedbackCell.vue'

const props = defineProps<{
  joker: Joker
  comparison: GuessComparison
  locale: Locale
}>()

const primaryName = computed(() =>
  props.locale === 'zh-CN' ? props.joker.name.zhCN : props.joker.name.en,
)
const secondaryName = computed(() =>
  props.locale === 'zh-CN' ? props.joker.name.en : props.joker.name.zhCN,
)
const priceLabel = computed(() => {
  if (props.comparison.acquisition.kind === 'soul') {
    return props.locale === 'zh-CN' ? '灵魂牌' : 'The Soul'
  }
  return `$${props.comparison.acquisition.shopPrice ?? '—'}`
})
const effectsLabel = computed(() =>
  listLabel(props.comparison.effects.values, effectLabel, props.locale),
)
const timingsLabel = computed(() =>
  listLabel(props.comparison.timings.values, timingLabel, props.locale),
)
const dependenciesLabel = computed(() =>
  props.comparison.dependencies.values
    .map((dependency) => dependencyLabel(dependency, props.locale))
    .join(props.locale === 'zh-CN' ? '、' : ', '),
)
</script>

<template>
  <article class="guess-row" :aria-label="primaryName">
    <div class="joker-cell">
      <img
        :src="joker.imagePath"
        :alt="t(locale, 'a11y.jokerImage', { name: primaryName })"
        width="44"
        height="60"
      />
      <div class="joker-cell__name">
        <strong>{{ primaryName }}</strong>
        <small>{{ secondaryName }}</small>
      </div>
    </div>
    <FeedbackCell
      :label="t(locale, 'clue.rarity')"
      :value="rarityLabel(comparison.rarity.value, locale)"
      :result="comparison.rarity.result"
      :direction="comparison.rarity.direction"
      :cell-index="0"
      :locale="locale"
    />
    <FeedbackCell
      :label="t(locale, 'clue.price')"
      :value="priceLabel"
      :result="comparison.acquisition.result"
      :direction="comparison.acquisition.direction"
      :cell-index="1"
      :locale="locale"
    />
    <FeedbackCell
      :label="t(locale, 'clue.effect')"
      :value="effectsLabel"
      :result="comparison.effects.result"
      :cell-index="2"
      :locale="locale"
    />
    <FeedbackCell
      :label="t(locale, 'clue.timing')"
      :value="timingsLabel"
      :result="comparison.timings.result"
      :cell-index="3"
      :locale="locale"
    />
    <FeedbackCell
      :label="t(locale, 'clue.dependency')"
      :value="dependenciesLabel"
      :result="comparison.dependencies.result"
      :cell-index="4"
      :locale="locale"
    />
  </article>
</template>

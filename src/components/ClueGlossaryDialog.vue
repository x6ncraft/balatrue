<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

import {
  JOKER_DEPENDENCY_FAMILIES,
  JOKER_EFFECTS,
  JOKER_RARITIES,
  JOKER_TIMINGS,
  type Joker,
  type JokerDependencyFamily,
} from '../data/types'
import { t, type Locale } from '../i18n'
import {
  dependencyFamilyDescription,
  dependencyFamilyLabel,
  dependencyValueLabel,
  effectDescription,
  effectLabel,
  rarityDescription,
  rarityLabel,
  timingDescription,
  timingLabel,
} from '../ui/labels'

const props = defineProps<{
  open: boolean
  locale: Locale
  jokers: readonly Joker[]
}>()

const emit = defineEmits<{
  close: []
}>()

const closeButton = ref<HTMLButtonElement | null>(null)
const dialog = ref<HTMLElement | null>(null)
let returnFocus: HTMLElement | null = null

const timingEntries = computed(() =>
  JOKER_TIMINGS.map((timing) => ({
    id: timing,
    label: timingLabel(timing, props.locale),
    description: timingDescription(timing, props.locale),
  })),
)

const rarityEntries = computed(() =>
  JOKER_RARITIES.map((rarity, index) => ({
    id: rarity,
    rank: index + 1,
    label: rarityLabel(rarity, props.locale),
    description: rarityDescription(rarity, props.locale),
  })),
)

const effectEntries = computed(() =>
  JOKER_EFFECTS.map((effect) => ({
    id: effect,
    label: effectLabel(effect, props.locale),
    description: effectDescription(effect, props.locale),
  })),
)

const shopPrices = computed(() =>
  [
    ...new Set(
      props.jokers.flatMap((joker) =>
        joker.official.shopPurchasable && joker.official.cost !== null ? [joker.official.cost] : [],
      ),
    ),
  ].sort((left, right) => left - right),
)

function actualValues(family: JokerDependencyFamily): string[] {
  const values = props.jokers.flatMap((joker) =>
    joker.classification.dependencies.flatMap((dependency) =>
      dependency.family === family && dependency.value ? [dependency.value] : [],
    ),
  )
  return [...new Set(values)].sort((left, right) =>
    dependencyValueLabel(left, props.locale).localeCompare(
      dependencyValueLabel(right, props.locale),
      props.locale,
    ),
  )
}

const dependencyEntries = computed(() =>
  JOKER_DEPENDENCY_FAMILIES.map((family) => ({
    id: family,
    label: dependencyFamilyLabel(family, props.locale),
    description: dependencyFamilyDescription(family, props.locale),
    values: actualValues(family),
  })),
)

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
    document.querySelector<HTMLElement>('.app-shell')?.toggleAttribute('inert', isOpen)
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
  document.querySelector<HTMLElement>('.app-shell')?.removeAttribute('inert')
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-backdrop glossary-backdrop" @mousedown.self="emit('close')">
      <section
        ref="dialog"
        class="dialog clue-glossary-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clue-glossary-title"
      >
        <header class="dialog__head">
          <div>
            <p class="dialog__kicker">{{ t(locale, 'glossary.kicker') }}</p>
            <h2 id="clue-glossary-title">{{ t(locale, 'glossary.title') }}</h2>
          </div>
          <button
            ref="closeButton"
            type="button"
            :aria-label="t(locale, 'action.close')"
            @click="emit('close')"
          >
            <X :size="20" aria-hidden="true" />
          </button>
        </header>

        <div class="dialog__body glossary-body">
          <p class="glossary-intro">{{ t(locale, 'glossary.intro') }}</p>

          <section aria-labelledby="rarity-glossary-title">
            <div class="glossary-section__head">
              <h3 id="rarity-glossary-title">{{ t(locale, 'clue.rarity') }}</h3>
              <span>{{ rarityEntries.length }}</span>
            </div>
            <div class="glossary-grid glossary-grid--rarity">
              <article v-for="entry in rarityEntries" :key="entry.id" class="glossary-entry">
                <div class="glossary-entry__title">
                  <strong>{{ entry.label }}</strong>
                  <small>{{ entry.rank }} / {{ rarityEntries.length }}</small>
                </div>
                <p>{{ entry.description }}</p>
              </article>
            </div>
            <p class="glossary-hint">{{ t(locale, 'glossary.rarityHint') }}</p>
          </section>

          <section aria-labelledby="price-glossary-title">
            <div class="glossary-section__head">
              <h3 id="price-glossary-title">{{ t(locale, 'clue.price') }}</h3>
              <span>2</span>
            </div>
            <div class="glossary-grid">
              <article class="glossary-entry">
                <strong>{{ t(locale, 'glossary.shopPrice') }}</strong>
                <p>{{ t(locale, 'glossary.shopPriceDescription') }}</p>
                <ul class="glossary-values">
                  <li v-for="price in shopPrices" :key="price">${{ price }}</li>
                </ul>
              </article>
              <article class="glossary-entry">
                <strong>{{ t(locale, 'collection.soul') }}</strong>
                <p>{{ t(locale, 'glossary.soulDescription') }}</p>
              </article>
            </div>
          </section>

          <section aria-labelledby="effect-glossary-title">
            <div class="glossary-section__head">
              <h3 id="effect-glossary-title">{{ t(locale, 'clue.effect') }}</h3>
              <span>{{ effectEntries.length }}</span>
            </div>
            <div class="glossary-grid glossary-grid--timing">
              <article v-for="entry in effectEntries" :key="entry.id" class="glossary-entry">
                <strong>{{ entry.label }}</strong>
                <p>{{ entry.description }}</p>
              </article>
            </div>
          </section>

          <section aria-labelledby="timing-glossary-title">
            <div class="glossary-section__head">
              <h3 id="timing-glossary-title">{{ t(locale, 'clue.timing') }}</h3>
              <span>{{ timingEntries.length }}</span>
            </div>
            <div class="glossary-grid glossary-grid--timing">
              <article v-for="entry in timingEntries" :key="entry.id" class="glossary-entry">
                <strong>{{ entry.label }}</strong>
                <p>{{ entry.description }}</p>
              </article>
            </div>
          </section>

          <section aria-labelledby="dependency-glossary-title">
            <div class="glossary-section__head">
              <h3 id="dependency-glossary-title">{{ t(locale, 'clue.dependency') }}</h3>
              <span>{{ dependencyEntries.length }}</span>
            </div>
            <div class="glossary-grid">
              <article v-for="entry in dependencyEntries" :key="entry.id" class="glossary-entry">
                <strong>{{ entry.label }}</strong>
                <p>{{ entry.description }}</p>
                <ul v-if="entry.values.length > 0" class="glossary-values">
                  <li v-for="value in entry.values" :key="value">
                    {{ dependencyValueLabel(value, locale) }}
                  </li>
                </ul>
              </article>
            </div>
          </section>

          <p class="classification-note">{{ t(locale, 'glossary.note') }}</p>
        </div>
      </section>
    </div>
  </Teleport>
</template>

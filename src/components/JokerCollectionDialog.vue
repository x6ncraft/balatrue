<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { BookOpen, Search, ShieldAlert, SlidersHorizontal, X } from 'lucide-vue-next'

import {
  JOKER_DEPENDENCY_FAMILIES,
  JOKER_EFFECTS,
  JOKER_RARITIES,
  JOKER_TIMINGS,
  type Joker,
  type JokerDependencyFamily,
  type JokerEffect,
  type JokerRarity,
  type JokerTiming,
} from '../data/types'
import { t, type Locale } from '../i18n'
import { buildJokerSearchIndex, searchJokers } from '../search'
import {
  dependencyFamilyLabel,
  dependencyLabel,
  effectLabel,
  listLabel,
  rarityLabel,
  timingLabel,
} from '../ui/labels'

const props = defineProps<{
  open: boolean
  locale: Locale
  jokers: readonly Joker[]
  requiresConfirmation: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()

const closeButton = ref<HTMLButtonElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const dialog = ref<HTMLElement | null>(null)
const query = ref('')
const rarityFilter = ref<JokerRarity | ''>('')
const effectFilter = ref<JokerEffect | ''>('')
const timingFilter = ref<JokerTiming | ''>('')
const dependencyFilter = ref<JokerDependencyFamily | ''>('')
const filtersOpen = ref(false)
let returnFocus: HTMLElement | null = null

const searchIndex = computed(() => buildJokerSearchIndex(props.jokers))
const matchingIds = computed<Set<string> | null>(() => {
  if (!query.value.trim()) return null
  return new Set(
    searchJokers(searchIndex.value, query.value, {
      locale: props.locale,
      limit: props.jokers.length,
    }).map((option) => option.id),
  )
})

const filteredJokers = computed(() =>
  [...props.jokers]
    .filter((joker) => matchingIds.value === null || matchingIds.value.has(joker.id))
    .filter((joker) => !rarityFilter.value || joker.official.rarity === rarityFilter.value)
    .filter(
      (joker) => !effectFilter.value || joker.classification.effects.includes(effectFilter.value),
    )
    .filter(
      (joker) => !timingFilter.value || joker.classification.timings.includes(timingFilter.value),
    )
    .filter(
      (joker) =>
        !dependencyFilter.value ||
        joker.classification.dependencies.some(
          (dependency) => dependency.family === dependencyFilter.value,
        ),
    )
    .sort((left, right) => left.number - right.number),
)

const activeFilterCount = computed(
  () =>
    [rarityFilter.value, effectFilter.value, timingFilter.value, dependencyFilter.value].filter(
      Boolean,
    ).length,
)

function primaryName(joker: Joker): string {
  return props.locale === 'zh-CN' ? joker.name.zhCN : joker.name.en
}

function secondaryName(joker: Joker): string {
  return props.locale === 'zh-CN' ? joker.name.en : joker.name.zhCN
}

function priceLabel(joker: Joker): string {
  return joker.classification.acquisition.kind === 'soul'
    ? t(props.locale, 'collection.soul')
    : `$${joker.official.cost ?? '—'}`
}

function resetFilters(): void {
  query.value = ''
  rarityFilter.value = ''
  effectFilter.value = ''
  timingFilter.value = ''
  dependencyFilter.value = ''
  void nextTick(() => searchInput.value?.focus())
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) emit('close')
  if (event.key !== 'Tab' || !props.open || !dialog.value) return

  const focusable = [
    ...dialog.value.querySelectorAll<HTMLElement>('button, [href], input, select, [tabindex]'),
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

watch(
  () => props.requiresConfirmation,
  (requiresConfirmation, previous) => {
    if (props.open && previous && !requiresConfirmation) {
      void nextTick(() => searchInput.value?.focus())
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
    <div v-if="open" class="dialog-backdrop collection-backdrop" @mousedown.self="emit('close')">
      <section
        ref="dialog"
        class="dialog collection-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-dialog-title"
      >
        <header class="dialog__head collection-dialog__head">
          <div>
            <p class="dialog__kicker">BALATRUE DATABASE</p>
            <h2 id="collection-dialog-title">{{ t(locale, 'collection.title') }}</h2>
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

        <div v-if="requiresConfirmation" class="collection-gate">
          <div class="collection-gate__mark" aria-hidden="true">
            <ShieldAlert :size="31" />
          </div>
          <p class="collection-gate__eyebrow">{{ t(locale, 'collection.warningEyebrow') }}</p>
          <h3>{{ t(locale, 'collection.warningTitle') }}</h3>
          <p>{{ t(locale, 'collection.warningBody') }}</p>
          <div class="collection-gate__actions">
            <button class="secondary-button" type="button" @click="emit('close')">
              {{ t(locale, 'collection.warningCancel') }}
            </button>
            <button class="primary-button" type="button" @click="emit('confirm')">
              <BookOpen :size="18" aria-hidden="true" />
              {{ t(locale, 'collection.warningConfirm') }}
            </button>
          </div>
        </div>

        <div v-else class="collection-content">
          <div class="collection-toolbar">
            <label class="collection-search">
              <span>{{ t(locale, 'collection.searchLabel') }}</span>
              <span class="collection-search__field">
                <Search :size="18" aria-hidden="true" />
                <input
                  ref="searchInput"
                  v-model="query"
                  type="search"
                  :placeholder="t(locale, 'collection.searchPlaceholder')"
                />
              </span>
            </label>

            <button
              class="collection-filter-toggle"
              type="button"
              :aria-expanded="filtersOpen"
              @click="filtersOpen = !filtersOpen"
            >
              <SlidersHorizontal :size="17" aria-hidden="true" />
              {{ t(locale, filtersOpen ? 'collection.hideFilters' : 'collection.showFilters') }}
              <span v-if="activeFilterCount > 0">{{ activeFilterCount }}</span>
            </button>

            <div class="collection-filters" :data-open="filtersOpen">
              <label>
                <span>{{ t(locale, 'clue.rarity') }}</span>
                <select v-model="rarityFilter">
                  <option value="">{{ t(locale, 'collection.all') }}</option>
                  <option v-for="rarity in JOKER_RARITIES" :key="rarity" :value="rarity">
                    {{ rarityLabel(rarity, locale) }}
                  </option>
                </select>
              </label>
              <label>
                <span>{{ t(locale, 'clue.effect') }}</span>
                <select v-model="effectFilter">
                  <option value="">{{ t(locale, 'collection.all') }}</option>
                  <option v-for="effect in JOKER_EFFECTS" :key="effect" :value="effect">
                    {{ effectLabel(effect, locale) }}
                  </option>
                </select>
              </label>
              <label>
                <span>{{ t(locale, 'clue.timing') }}</span>
                <select v-model="timingFilter">
                  <option value="">{{ t(locale, 'collection.all') }}</option>
                  <option v-for="timing in JOKER_TIMINGS" :key="timing" :value="timing">
                    {{ timingLabel(timing, locale) }}
                  </option>
                </select>
              </label>
              <label>
                <span>{{ t(locale, 'clue.dependency') }}</span>
                <select v-model="dependencyFilter">
                  <option value="">{{ t(locale, 'collection.all') }}</option>
                  <option v-for="family in JOKER_DEPENDENCY_FAMILIES" :key="family" :value="family">
                    {{ dependencyFamilyLabel(family, locale) }}
                  </option>
                </select>
              </label>
            </div>
          </div>

          <div class="collection-summary" role="status">
            <span>
              {{ t(locale, 'collection.results', { count: filteredJokers.length }) }}
            </span>
            <span>{{ t(locale, 'collection.classificationNote') }}</span>
          </div>

          <div v-if="filteredJokers.length > 0" class="collection-grid">
            <article
              v-for="joker in filteredJokers"
              :key="joker.id"
              class="collection-card"
              :aria-label="primaryName(joker)"
            >
              <div class="collection-card__identity">
                <img
                  :src="joker.imagePath"
                  :alt="t(locale, 'a11y.jokerImage', { name: primaryName(joker) })"
                  width="52"
                  height="70"
                  loading="lazy"
                />
                <div>
                  <span class="collection-card__number">
                    NO. {{ String(joker.number).padStart(3, '0') }}
                  </span>
                  <h3>{{ primaryName(joker) }}</h3>
                  <p>{{ secondaryName(joker) }}</p>
                </div>
              </div>

              <dl class="collection-card__facts">
                <div>
                  <dt>{{ t(locale, 'clue.rarity') }}</dt>
                  <dd>{{ rarityLabel(joker.official.rarity, locale) }}</dd>
                </div>
                <div>
                  <dt>{{ t(locale, 'clue.price') }}</dt>
                  <dd>{{ priceLabel(joker) }}</dd>
                </div>
                <div>
                  <dt>{{ t(locale, 'clue.effect') }}</dt>
                  <dd>{{ listLabel(joker.classification.effects, effectLabel, locale) }}</dd>
                </div>
                <div>
                  <dt>{{ t(locale, 'clue.timing') }}</dt>
                  <dd>{{ listLabel(joker.classification.timings, timingLabel, locale) }}</dd>
                </div>
                <div class="collection-card__wide">
                  <dt>{{ t(locale, 'clue.dependency') }}</dt>
                  <dd>
                    {{
                      joker.classification.dependencies
                        .map((dependency) => dependencyLabel(dependency, locale))
                        .join(locale === 'zh-CN' ? '、' : ', ')
                    }}
                  </dd>
                </div>
              </dl>
            </article>
          </div>

          <div v-else class="collection-empty">
            <p>{{ t(locale, 'collection.noResults') }}</p>
            <button class="secondary-button" type="button" @click="resetFilters">
              {{ t(locale, 'collection.clearFilters') }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { JOKER_DATA_META, jokers } from '../src/data/jokers.generated'
import {
  JOKER_ACQUISITION_KINDS,
  JOKER_CLASSIFICATION_VERSION,
  JOKER_DATA_GAME_VERSION,
  JOKER_DEPENDENCY_FAMILIES,
  JOKER_EFFECTS,
  JOKER_RARITIES,
  JOKER_TIMINGS,
  JOKER_UNLOCK_STATES,
  WIKI_JOKER_ACTIVATIONS,
  WIKI_JOKER_TYPES,
} from '../src/data/types'
import { gameplayClueSignature } from '../src/game/clue-model'
import { hasDependencyValueLabel } from '../src/ui/labels'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const generatedFile = join(projectRoot, 'src/data/jokers.generated.ts')
const imageDirectory = join(projectRoot, 'public/jokers')
const errors: string[] = []

function check(condition: unknown, message: string): void {
  if (!condition) errors.push(message)
}

function hasUniqueValues(values: readonly unknown[]): boolean {
  return new Set(values).size === values.length
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.includes(value as T)
}

if (!existsSync(generatedFile)) {
  throw new Error('[data] generated data is missing; run bun run data:sync')
}
if (!existsSync(imageDirectory)) {
  throw new Error('[data] image directory is missing; run bun run data:sync')
}

check(JOKER_DATA_META.gameVersion === JOKER_DATA_GAME_VERSION, 'Metadata game version is stale')
check(
  JOKER_DATA_META.classificationVersion === JOKER_CLASSIFICATION_VERSION,
  'Metadata classification version is stale',
)
check(JOKER_DATA_META.source.wikiPageRevision > 0, 'Missing Wiki page revision')
check(JOKER_DATA_META.source.enLocalizationRevision > 0, 'Missing English localization revision')
check(JOKER_DATA_META.source.zhCNLocalizationRevision > 0, 'Missing zh-CN localization revision')
check(Boolean(JOKER_DATA_META.source.enLocalizationVersion), 'Missing English localization version')
check(Boolean(JOKER_DATA_META.source.zhCNLocalizationVersion), 'Missing zh-CN localization version')
check(jokers.length === 150, `Expected 150 Jokers, found ${jokers.length}`)
check(hasUniqueValues(jokers.map((joker) => joker.id)), 'Joker IDs are not unique')
check(hasUniqueValues(jokers.map((joker) => joker.number)), 'Joker numbers are not unique')
check(hasUniqueValues(jokers.map((joker) => joker.name.en)), 'English names are not unique')
check(hasUniqueValues(jokers.map((joker) => joker.name.zhCN)), 'zh-CN names are not unique')

const rarityCounts = new Map(JOKER_RARITIES.map((rarity) => [rarity, 0]))
const expectedImageFiles = new Set<string>()

for (const [index, joker] of jokers.entries()) {
  const label = `${joker.id || `row ${index + 1}`}`
  check(/^j_[a-z0-9_]+$/.test(joker.id), `${label}: invalid stable ID`)
  check(joker.number === index + 1, `${label}: expected collection number ${index + 1}`)
  check(joker.name.en.trim().length > 0, `${label}: missing English name`)
  check(joker.name.zhCN.trim().length > 0, `${label}: missing zh-CN name`)
  check(joker.name.en === joker.name.en.trim(), `${label}: English name has outer whitespace`)
  check(joker.name.zhCN === joker.name.zhCN.trim(), `${label}: zh-CN name has outer whitespace`)
  check(joker.imagePath === `/jokers/${joker.id}.png`, `${label}: noncanonical image path`)
  check(joker.official.gameVersion === JOKER_DATA_GAME_VERSION, `${label}: stale game version`)
  check(isOneOf(joker.official.rarity, JOKER_RARITIES), `${label}: illegal rarity`)

  if (isOneOf(joker.official.rarity, JOKER_RARITIES)) {
    rarityCounts.set(joker.official.rarity, (rarityCounts.get(joker.official.rarity) ?? 0) + 1)
  }
  if (joker.official.rarity === 'legendary') {
    check(joker.official.cost === null, `${label}: Legendary shop price must be null`)
    check(!joker.official.shopPurchasable, `${label}: Legendary Joker cannot be shop-purchasable`)
  } else {
    check(
      Number.isInteger(joker.official.cost) &&
        (joker.official.cost ?? 0) >= 1 &&
        (joker.official.cost ?? 0) <= 10,
      `${label}: invalid shop price`,
    )
    check(joker.official.shopPurchasable, `${label}: non-Legendary Joker must be shop-purchasable`)
  }

  check(
    joker.source.wikiPageUrl.startsWith('https://balatrowiki.org/'),
    `${label}: invalid source URL`,
  )
  check(joker.source.effectTextEn.trim().length > 0, `${label}: missing source effect text`)
  check(joker.source.unlockRequirementEn.trim().length > 0, `${label}: missing unlock source text`)
  check(
    !joker.source.effectTextEn.includes('.mw-parser-output'),
    `${label}: CSS leaked into source text`,
  )
  check(
    !/&(?:#\d+|[a-z]+);/i.test(joker.source.effectTextEn),
    `${label}: HTML entity leaked into source text`,
  )
  check(isOneOf(joker.source.wikiType, WIKI_JOKER_TYPES), `${label}: illegal source wiki type`)
  check(
    isOneOf(joker.source.wikiActivation, WIKI_JOKER_ACTIVATIONS),
    `${label}: illegal source wiki activation`,
  )
  check(/^https:\/\//.test(joker.source.imageUrl), `${label}: invalid image source URL`)
  check(/^[a-f\d]{40}$/.test(joker.source.imageSha1), `${label}: invalid source image SHA-1`)
  check(/^[a-f\d]{40}$/.test(joker.source.localImageSha1), `${label}: invalid local image SHA-1`)
  check(
    joker.source.imageWidth > 0 && joker.source.imageHeight > 0,
    `${label}: invalid image dimensions`,
  )

  check(
    joker.classification.version === JOKER_CLASSIFICATION_VERSION,
    `${label}: stale classification version`,
  )
  check(
    isOneOf(joker.classification.acquisition.kind, JOKER_ACQUISITION_KINDS),
    `${label}: illegal acquisition kind`,
  )
  check(
    isOneOf(joker.classification.acquisition.unlockState, JOKER_UNLOCK_STATES),
    `${label}: illegal unlock state`,
  )
  check(joker.classification.effects.length > 0, `${label}: empty effect classification`)
  check(hasUniqueValues(joker.classification.effects), `${label}: duplicate effect classification`)
  for (const effect of joker.classification.effects) {
    check(isOneOf(effect, JOKER_EFFECTS), `${label}: illegal effect '${effect}'`)
  }
  check(joker.classification.timings.length > 0, `${label}: empty timing classification`)
  check(hasUniqueValues(joker.classification.timings), `${label}: duplicate timing classification`)
  for (const timing of joker.classification.timings) {
    check(isOneOf(timing, JOKER_TIMINGS), `${label}: illegal timing '${timing}'`)
  }
  check(joker.classification.dependencies.length > 0, `${label}: empty dependency classification`)
  check(
    hasUniqueValues(
      joker.classification.dependencies.map(({ family, value }) => `${family}:${value ?? ''}`),
    ),
    `${label}: duplicate dependency classification`,
  )
  for (const dependency of joker.classification.dependencies) {
    check(
      isOneOf(dependency.family, JOKER_DEPENDENCY_FAMILIES),
      `${label}: illegal dependency family '${dependency.family}'`,
    )
    check(
      dependency.value === undefined || dependency.value.trim().length > 0,
      `${label}: empty dependency value`,
    )
    check(
      dependency.value === undefined || hasDependencyValueLabel(dependency.value),
      `${label}: dependency value '${dependency.value}' has no localized label`,
    )
  }
  if (joker.classification.dependencies.some(({ family }) => family === 'none')) {
    check(
      joker.classification.dependencies.length === 1,
      `${label}: 'none' dependency must stand alone`,
    )
  }
  if (joker.official.rarity === 'legendary') {
    check(
      joker.classification.acquisition.kind === 'soul',
      `${label}: Legendary acquisition must be Soul`,
    )
    check(
      joker.classification.acquisition.unlockState === 'legendary',
      `${label}: Legendary unlock state is incorrect`,
    )
  } else {
    check(
      joker.classification.acquisition.kind === 'shop',
      `${label}: shop acquisition is incorrect`,
    )
  }

  const imageFileName = `${joker.id}.png`
  expectedImageFiles.add(imageFileName)
  const imageFile = join(imageDirectory, imageFileName)
  check(existsSync(imageFile), `${label}: local image is missing`)
  if (existsSync(imageFile)) {
    const bytes = await readFile(imageFile)
    const sha1 = createHash('sha1').update(bytes).digest('hex')
    check(sha1 === joker.source.localImageSha1, `${label}: local image SHA-1 mismatch`)
    check(bytes.subarray(1, 4).toString() === 'PNG', `${label}: local asset is not a PNG`)
    if (bytes.length >= 24) {
      check(
        bytes.readUInt32BE(16) === joker.source.imageWidth,
        `${label}: local image width mismatch`,
      )
      check(
        bytes.readUInt32BE(20) === joker.source.imageHeight,
        `${label}: local image height mismatch`,
      )
    }
  }
}

const expectedRarityCounts = { common: 61, uncommon: 64, rare: 20, legendary: 5 } as const
for (const rarity of JOKER_RARITIES) {
  check(
    rarityCounts.get(rarity) === expectedRarityCounts[rarity],
    `Expected ${expectedRarityCounts[rarity]} ${rarity} Jokers, found ${rarityCounts.get(rarity) ?? 0}`,
  )
}

const gameplaySignatures = new Map<string, string[]>()
for (const joker of jokers) {
  const signature = gameplayClueSignature(joker)
  const names = gameplaySignatures.get(signature) ?? []
  names.push(joker.name.en)
  gameplaySignatures.set(signature, names)
}
check(
  gameplaySignatures.size === jokers.length,
  `Expected ${jokers.length}/${jokers.length} unique player clue signatures, found ${gameplaySignatures.size}/${jokers.length}`,
)
for (const names of gameplaySignatures.values()) {
  check(names.length === 1, `Indistinguishable player clue signature: ${names.join(', ')}`)
}

const actualImageFiles = (await readdir(imageDirectory)).filter((file) => file.endsWith('.png'))
check(actualImageFiles.length === 150, `Expected 150 local PNGs, found ${actualImageFiles.length}`)
for (const file of actualImageFiles) {
  check(expectedImageFiles.has(file), `Unexpected local Joker image '${file}'`)
}

if (errors.length > 0) {
  console.error(`[data] validation failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exitCode = 1
} else {
  console.log(
    `[data] valid: ${jokers.length} Jokers, 150 official names in EN/zh-CN, rarity 61/64/20/5, ${gameplaySignatures.size}/150 unique player clue signatures, ${actualImageFiles.length} verified images`,
  )
}

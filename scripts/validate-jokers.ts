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
  type JokerDataMeta,
  type WikiJokerActivation,
  type WikiJokerType,
} from '../src/data/types'
import {
  GAME_DEPENDENCY_FAMILIES,
  GAME_EFFECT_CATEGORIES,
  GAME_TIMING_FAMILIES,
  gameEffectFamily,
  gameTimingFamily,
  gameplayClueSignature,
  projectJokerDependencies,
  projectJokerEffectCategories,
  projectJokerTimingFamilies,
  projectJokerTimings,
} from '../src/game/clue-model'
import { hasDependencyValueLabel, hasEffectLabel, hasTimingLabel } from '../src/ui/labels'
import { JOKER_SEARCH_ALIASES } from '../src/search/joker-search.generated'
import { generateJokerSearchAliases } from './generate-joker-search'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const generatedFile = join(projectRoot, 'src/data/jokers.generated.ts')
const searchAliasesFile = join(projectRoot, 'src/search/joker-search.generated.ts')
const provenanceFile = join(projectRoot, 'data/jokers.provenance.generated.json')
const sourceReviewFile = join(projectRoot, 'data/upstream/jokers.wiki.generated.json')
const imageDirectory = join(projectRoot, 'public/jokers')
const errors: string[] = []

interface SourceAuditRecord {
  id: string
  number: number
  name: { en: string; zhCN: string }
  referencePageUrl: string
  effectTextEn: string
  unlockRequirementEn: string
  cost: number | null
  rarity: (typeof JOKER_RARITIES)[number]
  wikiType: WikiJokerType
  wikiActivation: WikiJokerActivation
  imageUrl: string
  imageSha1: string
  imageWidth: number
  imageHeight: number
}

interface SourceAuditFile {
  schemaVersion: number
  distribution: string
  capturedAt: string
  licenseNotice: {
    spdx: string
    projectLicense: string
    source: string
    sourceUrl: string
    attribution: string
    sourceLicenseNotice: string
    sourceLicenseUrl: string
    modifications: string
    rights: string
    details: string
  }
  metadata: JokerDataMeta
  jokers: SourceAuditRecord[]
}

interface PublicProvenanceRecord {
  id: string
  number: number
  name: { en: string; zhCN: string }
  referencePageUrl: string
  imageDescriptionPageUrl: string
  imageSourceUrl: string
  sourceImageSha1: string
  localImageSha1: string
  imageWidth: number
  imageHeight: number
  effectTextSha256: string
  unlockRequirementSha256: string
  wikiType: WikiJokerType
  wikiActivation: WikiJokerActivation
}

interface PublicProvenanceFile {
  schemaVersion: number
  rightsNotice: string
  metadata: JokerDataMeta
  jokers: PublicProvenanceRecord[]
}

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
  throw new Error('[data] generated runtime data is missing')
}
if (!existsSync(searchAliasesFile)) {
  throw new Error('[data] generated search aliases are missing')
}
if (!existsSync(provenanceFile)) {
  throw new Error('[data] public provenance data is missing')
}
if (!existsSync(sourceReviewFile)) {
  throw new Error('[data] checked-in source-review data is missing')
}
if (!existsSync(imageDirectory)) {
  throw new Error('[data] local image directory is missing')
}

const provenance = JSON.parse(await readFile(provenanceFile, 'utf8')) as PublicProvenanceFile
const provenanceById = new Map(provenance.jokers.map((record) => [record.id, record]))
const sourceReview = JSON.parse(await readFile(sourceReviewFile, 'utf8')) as SourceAuditFile
const sourceReviewById = new Map(sourceReview.jokers.map((record) => [record.id, record]))

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
const expectedSearchAliases = generateJokerSearchAliases(jokers)
const expectedSearchIds = new Set(jokers.map((joker) => joker.id))
const actualSearchIds = Object.keys(JOKER_SEARCH_ALIASES)
check(
  actualSearchIds.length === jokers.length,
  `Expected ${jokers.length} search aliases, found ${actualSearchIds.length}`,
)
for (const id of actualSearchIds) {
  check(expectedSearchIds.has(id), `Unexpected search aliases for ${id}`)
}
check(provenance.schemaVersion === 1, 'Unsupported public provenance schema')
check(
  provenance.rightsNotice.includes('excluded from the project MIT license'),
  'Public provenance has no asset-rights boundary',
)
check(
  provenance.jokers.length === 150,
  `Expected 150 public provenance records, found ${provenance.jokers.length}`,
)
check(
  JSON.stringify(provenance.metadata) === JSON.stringify(JOKER_DATA_META),
  'Public provenance metadata differs from runtime metadata',
)
check(sourceReview.schemaVersion === 2, 'Unsupported source-review schema')
check(
  sourceReview.distribution === 'upstream-source-review-data',
  'Source-review data has no upstream distribution marker',
)
check(
  !Number.isNaN(Date.parse(sourceReview.capturedAt)),
  'Source-review data has no capture timestamp',
)
check(
  sourceReview.licenseNotice.spdx === 'NOASSERTION',
  'Source-review data overstates its license',
)
check(
  sourceReview.licenseNotice.projectLicense === 'Excluded from the root MIT license',
  'Source-review data has no project-license boundary',
)
check(
  sourceReview.licenseNotice.sourceUrl === 'https://balatrowiki.org/w/Jokers' &&
    sourceReview.licenseNotice.sourceLicenseUrl ===
      'https://creativecommons.org/licenses/by-nc-sa/3.0/' &&
    sourceReview.licenseNotice.attribution === 'Balatro Wiki contributors' &&
    sourceReview.licenseNotice.modifications.length > 0,
  'Source-review data has incomplete attribution',
)
check(
  sourceReview.jokers.length === 150,
  `Expected 150 source-review records, found ${sourceReview.jokers.length}`,
)
check(
  JSON.stringify(sourceReview.metadata) === JSON.stringify(JOKER_DATA_META),
  'Source-review metadata differs from runtime metadata',
)
check(
  JOKER_DATA_META.source.wikiPageUrl ===
    `https://balatrowiki.org/w/Jokers?oldid=${JOKER_DATA_META.source.wikiPageRevision}`,
  'Wiki source URL does not identify the parsed revision',
)
check(
  JOKER_DATA_META.source.enLocalizationUrl ===
    `https://balatrowiki.org/w/Module:Localization/en-us?oldid=${JOKER_DATA_META.source.enLocalizationRevision}`,
  'English localization URL does not identify the parsed revision',
)
check(
  JOKER_DATA_META.source.zhCNLocalizationUrl ===
    `https://balatrowiki.org/w/Module:Localization/zh-cn?oldid=${JOKER_DATA_META.source.zhCNLocalizationRevision}`,
  'zh-CN localization URL does not identify the parsed revision',
)
check(hasUniqueValues(jokers.map((joker) => joker.id)), 'Joker IDs are not unique')
check(hasUniqueValues(jokers.map((joker) => joker.number)), 'Joker numbers are not unique')
check(hasUniqueValues(jokers.map((joker) => joker.name.en)), 'English names are not unique')
check(hasUniqueValues(jokers.map((joker) => joker.name.zhCN)), 'zh-CN names are not unique')
check(
  hasUniqueValues(provenance.jokers.map((record) => record.id)),
  'Public provenance Joker IDs are not unique',
)
check(
  hasUniqueValues(sourceReview.jokers.map((record) => record.id)),
  'Source-review Joker IDs are not unique',
)

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
  const searchAliases = JOKER_SEARCH_ALIASES[joker.id]
  const expectedAliases = expectedSearchAliases[joker.id]
  check(Boolean(searchAliases), `${label}: missing search aliases`)
  check(
    Boolean(searchAliases?.[0] && searchAliases[1]),
    `${label}: search aliases must be non-empty`,
  )
  check(
    searchAliases !== undefined &&
      expectedAliases !== undefined &&
      searchAliases[0] === expectedAliases[0] &&
      searchAliases[1] === expectedAliases[1],
    `${label}: stale search aliases`,
  )
  const provenanceRecord = provenanceById.get(joker.id)
  check(Boolean(provenanceRecord), `${label}: missing public provenance record`)
  if (provenanceRecord) {
    check(provenanceRecord.number === joker.number, `${label}: provenance number mismatch`)
    check(provenanceRecord.name.en === joker.name.en, `${label}: provenance English name mismatch`)
    check(
      provenanceRecord.name.zhCN === joker.name.zhCN,
      `${label}: provenance zh-CN name mismatch`,
    )
    check(
      provenanceRecord.effectTextSha256 === joker.source.effectTextSha256,
      `${label}: provenance effect digest mismatch`,
    )
    check(
      provenanceRecord.unlockRequirementSha256 === joker.source.unlockRequirementSha256,
      `${label}: provenance unlock digest mismatch`,
    )
    check(provenanceRecord.wikiType === joker.source.wikiType, `${label}: provenance type mismatch`)
    check(
      provenanceRecord.wikiActivation === joker.source.wikiActivation,
      `${label}: provenance activation mismatch`,
    )
    check(
      provenanceRecord.sourceImageSha1 === joker.source.imageSha1,
      `${label}: provenance source image SHA-1 mismatch`,
    )
    check(
      provenanceRecord.localImageSha1 === joker.source.localImageSha1,
      `${label}: provenance local image SHA-1 mismatch`,
    )
    check(
      provenanceRecord.imageWidth === joker.source.imageWidth &&
        provenanceRecord.imageHeight === joker.source.imageHeight,
      `${label}: provenance image dimensions mismatch`,
    )
    check(
      provenanceRecord.referencePageUrl.startsWith('https://balatrowiki.org/w/'),
      `${label}: invalid provenance reference URL`,
    )
    check(
      provenanceRecord.imageDescriptionPageUrl.startsWith('https://balatrowiki.org/w/File:'),
      `${label}: invalid provenance image description URL`,
    )
    check(
      provenanceRecord.imageSourceUrl.startsWith('https://balatrowiki.org/images/'),
      `${label}: invalid provenance image URL`,
    )
  }
  const sourceReviewRecord = sourceReviewById.get(joker.id)
  check(Boolean(sourceReviewRecord), `${label}: missing source-review record`)
  if (sourceReviewRecord) {
    check(sourceReviewRecord.number === joker.number, `${label}: source-review number mismatch`)
    check(
      sourceReviewRecord.name.en === joker.name.en,
      `${label}: source-review English name mismatch`,
    )
    check(
      sourceReviewRecord.name.zhCN === joker.name.zhCN,
      `${label}: source-review zh-CN name mismatch`,
    )
    check(
      createHash('sha256').update(sourceReviewRecord.effectTextEn, 'utf8').digest('hex') ===
        joker.source.effectTextSha256,
      `${label}: effect source digest mismatch`,
    )
    check(
      createHash('sha256').update(sourceReviewRecord.unlockRequirementEn, 'utf8').digest('hex') ===
        joker.source.unlockRequirementSha256,
      `${label}: unlock source digest mismatch`,
    )
    check(sourceReviewRecord.cost === joker.official.cost, `${label}: source-review cost mismatch`)
    check(
      sourceReviewRecord.rarity === joker.official.rarity,
      `${label}: source-review rarity mismatch`,
    )
    check(sourceReviewRecord.wikiType === joker.source.wikiType, `${label}: Wiki type mismatch`)
    check(
      sourceReviewRecord.wikiActivation === joker.source.wikiActivation,
      `${label}: Wiki activation mismatch`,
    )
    check(
      sourceReviewRecord.imageSha1 === joker.source.imageSha1,
      `${label}: source image SHA-1 mismatch`,
    )
    check(
      sourceReviewRecord.imageWidth === joker.source.imageWidth &&
        sourceReviewRecord.imageHeight === joker.source.imageHeight,
      `${label}: source-review image dimensions mismatch`,
    )
    if (provenanceRecord) {
      check(
        provenanceRecord.referencePageUrl === sourceReviewRecord.referencePageUrl,
        `${label}: provenance reference URL mismatch`,
      )
      check(
        provenanceRecord.imageSourceUrl === sourceReviewRecord.imageUrl,
        `${label}: provenance image URL mismatch`,
      )
    }
    check(sourceReviewRecord.effectTextEn.trim().length > 0, `${label}: empty effect source text`)
    check(
      sourceReviewRecord.unlockRequirementEn.trim().length > 0,
      `${label}: empty unlock source text`,
    )
    check(
      sourceReviewRecord.effectTextEn === sourceReviewRecord.effectTextEn.trim(),
      `${label}: effect source text has outer whitespace`,
    )
    check(
      sourceReviewRecord.unlockRequirementEn === sourceReviewRecord.unlockRequirementEn.trim(),
      `${label}: unlock source text has outer whitespace`,
    )
    check(
      !sourceReviewRecord.effectTextEn.includes('.mw-parser-output') &&
        !sourceReviewRecord.unlockRequirementEn.includes('.mw-parser-output'),
      `${label}: MediaWiki CSS leaked into source text`,
    )
    check(
      !/&(?:#\d+|#x[a-f\d]+|[a-z][a-z\d]+);/i.test(sourceReviewRecord.effectTextEn) &&
        !/&(?:#\d+|#x[a-f\d]+|[a-z][a-z\d]+);/i.test(sourceReviewRecord.unlockRequirementEn),
      `${label}: HTML entity leaked into source text`,
    )
    check(
      sourceReviewRecord.referencePageUrl.startsWith('https://balatrowiki.org/w/'),
      `${label}: invalid Wiki reference URL`,
    )
    check(
      sourceReviewRecord.imageUrl.startsWith('https://balatrowiki.org/images/'),
      `${label}: invalid source image URL`,
    )
  }
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
    /^[a-f\d]{64}$/.test(joker.source.effectTextSha256),
    `${label}: invalid effect source SHA-256`,
  )
  check(
    /^[a-f\d]{64}$/.test(joker.source.unlockRequirementSha256),
    `${label}: invalid unlock source SHA-256`,
  )
  check(isOneOf(joker.source.wikiType, WIKI_JOKER_TYPES), `${label}: illegal source wiki type`)
  check(
    isOneOf(joker.source.wikiActivation, WIKI_JOKER_ACTIVATIONS),
    `${label}: illegal source wiki activation`,
  )
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
    check(hasEffectLabel(effect), `${label}: effect '${effect}' has no localized label`)
    try {
      gameEffectFamily(effect)
    } catch {
      check(false, `${label}: effect '${effect}' has no player-facing family`)
    }
  }
  check(joker.classification.timings.length > 0, `${label}: empty timing classification`)
  check(hasUniqueValues(joker.classification.timings), `${label}: duplicate timing classification`)
  for (const timing of joker.classification.timings) {
    check(isOneOf(timing, JOKER_TIMINGS), `${label}: illegal timing '${timing}'`)
    check(hasTimingLabel(timing), `${label}: timing '${timing}' has no localized label`)
    check(
      Boolean(gameTimingFamily(timing)),
      `${label}: timing '${timing}' has no player-facing family`,
    )
  }
  check(projectJokerTimings(joker).length > 0, `${label}: no player-facing trigger timing`)
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
    check(
      dependency.family === 'none' || dependency.value !== undefined,
      `${label}: dependency '${dependency.family}' is only a scope, not a narrowing condition`,
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

const effectCategoryCounts = new Map(GAME_EFFECT_CATEGORIES.map((category) => [category, 0]))
const timingFamilyCounts = new Map(GAME_TIMING_FAMILIES.map((family) => [family, 0]))
const dependencyFamilyCounts = new Map(GAME_DEPENDENCY_FAMILIES.map((family) => [family, 0]))
for (const joker of jokers) {
  for (const category of projectJokerEffectCategories(joker)) {
    effectCategoryCounts.set(category, (effectCategoryCounts.get(category) ?? 0) + 1)
  }
  for (const family of projectJokerTimingFamilies(joker)) {
    timingFamilyCounts.set(family, (timingFamilyCounts.get(family) ?? 0) + 1)
  }
  for (const family of new Set(projectJokerDependencies(joker).map(({ family }) => family))) {
    dependencyFamilyCounts.set(family, (dependencyFamilyCounts.get(family) ?? 0) + 1)
  }
}
for (const [category, count] of effectCategoryCounts) {
  check(count >= 10, `Player effect category '${category}' only covers ${count} Joker(s)`)
}
for (const [family, count] of timingFamilyCounts) {
  check(count >= 5, `Player timing category '${family}' only covers ${count} Joker(s)`)
}
for (const [family, count] of dependencyFamilyCounts) {
  check(count >= 8, `Player dependency category '${family}' only covers ${count} Joker(s)`)
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
    `[data] valid: ${jokers.length} Jokers, 150 in-game names in EN/zh-CN, ${actualSearchIds.length} search aliases, rarity 61/64/20/5, ${gameplaySignatures.size}/150 unique player clue signatures, ${actualImageFiles.length} verified images, 300 repository source fields verified`,
  )
}

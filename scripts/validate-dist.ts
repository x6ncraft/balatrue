import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const projectRoot = join(import.meta.dir, '..')
const requiredArtifacts = [
  'dist/index.html',
  'dist/legal/LICENSE',
  'dist/legal/LICENSE_SCOPE.md',
  'dist/legal/ASSET_NOTICE.md',
  'dist/legal/THIRD_PARTY_NOTICES.md',
  'dist/legal/data/jokers.provenance.generated.json',
  'dist/legal/data/upstream/README.md',
  'dist/legal/licenses/React-MIT.txt',
  'dist/legal/licenses/React-DOM-MIT.txt',
  'dist/legal/licenses/Scheduler-MIT.txt',
  'dist/legal/licenses/Lucide-ISC.txt',
  'dist/legal/licenses/Silkscreen-OFL-1.1.txt',
] as const

const missing = requiredArtifacts.filter((path) => !existsSync(join(projectRoot, path)))
if (missing.length > 0) {
  throw new Error(`[build] missing required release artifacts:\n${missing.join('\n')}`)
}

if (existsSync(join(projectRoot, 'dist/data/upstream'))) {
  throw new Error('[build] repository-only source-review data leaked into dist')
}

interface PublicProvenanceFile {
  schemaVersion: number
  rightsNotice: string
  metadata: unknown
  jokers: Array<{
    id: string
  }>
}

interface SourceReviewFile {
  metadata: unknown
  jokers: Array<{
    id: string
    effectTextEn: string
    unlockRequirementEn: string
  }>
}

const textFiles = await Array.fromAsync(
  new Bun.Glob('dist/**/*.{css,html,js,json,md,mjs,cjs,txt}').scan({
    cwd: projectRoot,
    onlyFiles: true,
  }),
)
if (!textFiles.some((path) => path.endsWith('.js'))) {
  throw new Error('[build] production JavaScript bundle is missing')
}

const publicText = (
  await Promise.all(textFiles.map((path) => readFile(join(projectRoot, path), 'utf8')))
).join('\n')

const forbiddenSourceMarkers = [
  'effectTextEn',
  'unlockRequirementEn',
  'upstream-source-review-data',
] as const
const leakedMarkers = forbiddenSourceMarkers.filter((marker) => publicText.includes(marker))
if (leakedMarkers.length > 0) {
  throw new Error(
    `[build] repository-only source-review fields leaked into dist:\n${leakedMarkers.join('\n')}`,
  )
}

const provenance = JSON.parse(
  await readFile(join(projectRoot, 'dist/legal/data/jokers.provenance.generated.json'), 'utf8'),
) as PublicProvenanceFile
if (
  provenance.schemaVersion !== 1 ||
  provenance.jokers.length !== 150 ||
  new Set(provenance.jokers.map(({ id }) => id)).size !== 150 ||
  !provenance.rightsNotice.includes('excluded from the project MIT license')
) {
  throw new Error('[build] public Joker provenance is incomplete or malformed')
}

const sourceReviewPath = join(projectRoot, 'data/upstream/jokers.wiki.generated.json')
if (!existsSync(sourceReviewPath)) {
  throw new Error('[build] checked-in source-review data is missing')
}
const sourceReview = JSON.parse(await readFile(sourceReviewPath, 'utf8')) as SourceReviewFile
if (
  sourceReview.jokers.length !== 150 ||
  new Set(sourceReview.jokers.map(({ id }) => id)).size !== 150 ||
  JSON.stringify(sourceReview.metadata) !== JSON.stringify(provenance.metadata)
) {
  throw new Error('[build] checked-in source-review data is incomplete or mismatched')
}

let reviewedSourceFields = 0
const leakedSourceFields: string[] = []
for (const record of sourceReview.jokers) {
  for (const [field, value] of [
    ['effectTextEn', record.effectTextEn],
    ['unlockRequirementEn', record.unlockRequirementEn],
  ] as const) {
    if (!value.trim()) throw new Error(`[build] empty source field: ${record.id}:${field}`)
    reviewedSourceFields += 1
    if (publicText.includes(value)) leakedSourceFields.push(`${record.id}:${field}`)
  }
}
if (leakedSourceFields.length > 0) {
  throw new Error(
    `[build] repository-only upstream prose leaked into dist:\n${leakedSourceFields.join('\n')}`,
  )
}

console.log(
  `[build] verified ${requiredArtifacts.length} release artifacts, ${provenance.jokers.length} public provenance records${reviewedSourceFields ? `, and ${reviewedSourceFields} repository source fields` : ''}`,
)

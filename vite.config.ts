/// <reference types="vitest/config" />

import { readFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const legalAssets = [
  ['legal/LICENSE', new URL('./LICENSE', import.meta.url)],
  ['legal/LICENSE_SCOPE.md', new URL('./LICENSE_SCOPE.md', import.meta.url)],
  ['legal/ASSET_NOTICE.md', new URL('./ASSET_NOTICE.md', import.meta.url)],
  ['legal/THIRD_PARTY_NOTICES.md', new URL('./THIRD_PARTY_NOTICES.md', import.meta.url)],
  [
    'legal/data/jokers.provenance.generated.json',
    new URL('./data/jokers.provenance.generated.json', import.meta.url),
  ],
  ['legal/data/upstream/README.md', new URL('./data/upstream/README.md', import.meta.url)],
  ['legal/licenses/React-MIT.txt', new URL('./node_modules/react/LICENSE', import.meta.url)],
  [
    'legal/licenses/React-DOM-MIT.txt',
    new URL('./node_modules/react-dom/LICENSE', import.meta.url),
  ],
  [
    'legal/licenses/Scheduler-MIT.txt',
    new URL('./node_modules/scheduler/LICENSE', import.meta.url),
  ],
  [
    'legal/licenses/Lucide-ISC.txt',
    new URL('./node_modules/lucide-react/LICENSE', import.meta.url),
  ],
  [
    'legal/licenses/Silkscreen-OFL-1.1.txt',
    new URL('./node_modules/@fontsource/silkscreen/LICENSE', import.meta.url),
  ],
] as const

function emitLegalAssets(): Plugin {
  return {
    name: 'balatrue-legal-assets',
    async generateBundle() {
      for (const [fileName, source] of legalAssets) {
        this.emitFile({ type: 'asset', fileName, source: await readFile(source, 'utf8') })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), emitLegalAssets()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})

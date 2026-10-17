/*
 * Build of the caifudeguo AV-Depot page (static, no third-party requests).
 * AGPL-3.0-only.
 */
import { execSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

function buildSha() {
  if (process.env.CFD_BUILD_SHA)
    return process.env.CFD_BUILD_SHA
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  }
  catch {
    return ''
  }
}

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  define: { __CFD_BUILD_SHA__: JSON.stringify(buildSha()) },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0,
    target: 'es2020',
  },
})

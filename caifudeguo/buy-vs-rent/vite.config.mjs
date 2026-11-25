import { execSync } from 'node:child_process'
import { copyFileSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

function buildSha() {
  if (process.env.CFD_BUILD_SHA) return process.env.CFD_BUILD_SHA
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  define: { __CBR_BUILD_SHA__: JSON.stringify(buildSha()) },
  worker: { format: 'es' },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0,
    target: 'es2020',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  server: {
    port: 4177,
    strictPort: true,
  },
  preview: {
    port: 4177,
    strictPort: true,
  },
  plugins: [
    {
      name: 'copy-host',
      closeBundle() {
        const dir = fileURLToPath(new URL('.', import.meta.url))
        copyFileSync(
          `${dir}host-wp-column.html`,
          `${dir}dist/host-wp-column.html`,
        )
        copyFileSync(`${dir}rocket-host.html`, `${dir}dist/rocket-host.html`)
        copyFileSync(
          `${dir}rocket-host-cfg.html`,
          `${dir}dist/rocket-host-cfg.html`,
        )
        copyFileSync(`${dir}plugin/assets/embed.js`, `${dir}dist/embed.js`)
      },
    },
  ],
})

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['caifudeguo/buy-vs-rent/test/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'caifudeguo/buy-vs-rent/e2e/**'],
    root: new URL('../..', import.meta.url).pathname,
  },
})

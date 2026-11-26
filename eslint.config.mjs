// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu({
  stylistic: false,
  // generated from the core by caifudeguo/av-ui/scripts/precise-core.mjs (kept byte-identical to the transform)
  ignores: [
    'caifudeguo/av-ui/src/generated/**',
    'caifudeguo/buy-vs-rent/e2e/**',
    'caifudeguo/buy-vs-rent/playwright.config.ts',
    'caifudeguo/buy-vs-rent/dist/**',
  ],
})

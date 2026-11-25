import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '*.e2e.ts',
  fullyParallel: false,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:4177', trace: 'off' },
  webServer: [
    {
      command:
        'npx vite preview --config caifudeguo/buy-vs-rent/vite.config.mjs --host 127.0.0.1 --port 4177 --strictPort',
      url: 'http://127.0.0.1:4177/host-wp-column.html',
      cwd: '../..',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'node caifudeguo/buy-vs-rent/e2e/parent-server.mjs',
      url: 'http://127.0.0.1:4178/share-host.html',
      cwd: '../..',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})

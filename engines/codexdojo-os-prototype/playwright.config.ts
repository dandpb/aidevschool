import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      name: 'codexDojo OS',
      command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      name: 'codexDojo dashboard',
      command: 'pnpm exec vite --host 127.0.0.1 --port 5175 --strictPort',
      cwd: '../codexDojo',
      url: 'http://127.0.0.1:5175',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      name: 'PixelDojo Quest',
      command: 'pnpm exec vite --host 127.0.0.1 --port 5176 --strictPort',
      cwd: '../pixelDojo/pixel-quest',
      url: 'http://127.0.0.1:5176',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      name: 'voxelDojo HASH RING',
      command: 'pnpm exec vite --host 127.0.0.1 --port 5177 --strictPort',
      cwd: '../voxelDojo/game-10-hash-ring',
      url: 'http://127.0.0.1:5177',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: 'desktop-1280', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'tablet-768', use: { viewport: { width: 768, height: 900 } } },
    { name: 'mobile-375', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } } },
  ],
})

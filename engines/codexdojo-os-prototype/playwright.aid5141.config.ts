// AID-5141/W5: scoped capture config for the HUD alias evidence (single
// local OS dev server; CI keeps using playwright.config.ts). Same
// retained-config pattern as playwright.aid5080.config.ts (AID-5080):
// committed so the exact capture runtime is reproducible and auditable,
// without booting the six-server shared workspace config.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: /hud-aliases\.smoke\.spec\.ts/,
  outputDir: './test-results-aid5141',
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4176',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      name: 'codexDojo OS',
      command: 'VITE_LOCAL_ENGINE_BRIDGE=true npm run dev -- --host 127.0.0.1 --port 4176 --strictPort',
      url: 'http://127.0.0.1:4176',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: 'desktop-1280', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile-375', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 } } },
  ],
})

// AID-5080/W4: scoped capture config for the journey washed-node AA contrast
// evidence (single local OS dev server; CI keeps using playwright.config.ts).
// Same retained-config pattern as playwright.aid3643.config.ts (AID-3643):
// committed so the exact capture runtime is reproducible and auditable,
// without booting the six-server shared workspace config.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: /a11y-w4\.smoke\.spec\.ts/,
  outputDir: './test-results-aid5080',
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      name: 'codexDojo OS',
      command: 'VITE_LOCAL_ENGINE_BRIDGE=true npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: 'desktop-1280', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile-375', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 } } },
  ],
})

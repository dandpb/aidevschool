// AID-3643: RETAINED capture config for the pg-c01 visual-delta evidence
// (single local OS dev server; CI keeps using playwright.config.ts). Unlike
// the AID-3590 disposable config — which was not retained and had to be
// declared as a browser-metadata gap in capture-manifest.md v2 — this file
// is committed so the exact capture runtime (browser engine, projects,
// viewports, base URL) is reproducible and auditable.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results-aid3643',
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

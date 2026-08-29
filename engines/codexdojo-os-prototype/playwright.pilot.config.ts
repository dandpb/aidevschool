// Runs tests-pilot/ against the STATIC build (dist/, including dist/apps/),
// with no engine dev servers. Use `npm run test:smoke:pilot`, which builds
// first. The dev-server suite lives in playwright.config.ts.
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests-pilot',
  outputDir: './test-results-pilot',
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4176',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    // preview only — never `dev`, so a missing bundle fails instead of being
    // silently served by a runtime's own dev server.
    command: 'npx vite preview --host 127.0.0.1 --port 4176 --strictPort',
    url: 'http://127.0.0.1:4176',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: 'desktop-1280', use: { viewport: { width: 1280, height: 800 } } }],
})

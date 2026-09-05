import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.QA_BASE_URL
if (baseURL === undefined || baseURL === '') {
  throw new Error(
    'QA_BASE_URL is required (point it at the published deploy, e.g. a Netlify draft); the remote pre-check never starts a local server.',
  )
}

export default defineConfig({
  testDir: './tests-remote',
  outputDir: './test-results-remote',
  retries: 0,
  workers: 1,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-1280', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'tablet-768', use: { viewport: { width: 768, height: 900 } } },
    { name: 'mobile-375', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 } } },
  ],
})

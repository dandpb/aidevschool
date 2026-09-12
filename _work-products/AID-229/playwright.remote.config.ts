import { defineConfig, devices } from '../../engines/codexdojo-os-prototype/node_modules/@playwright/test/index.js'

export default defineConfig({
  testDir: '.',
  testMatch: 'remote-warehouse-retry.spec.ts',
  outputDir: 'test-results',
  retries: 0,
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'https://6a8f7ece5ac75e84270cc00e--aidevschool-engine-lab-preview.netlify.app',
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'on',
  },
})

import { defineConfig } from "@playwright/test"

const baseURL = "http://127.0.0.1:4416"

export default defineConfig({
  testDir: "./playwright",
  timeout: 60_000,
  use: {
    baseURL,
    viewport: { width: 1280, height: 900 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})

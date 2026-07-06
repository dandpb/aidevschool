import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./playwright",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:4405",
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:4405",
    reuseExistingServer: false,
    timeout: 120_000,
  },
})

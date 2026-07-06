import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./playwright",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4402",
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: "pnpm dev",
    port: 4402,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})

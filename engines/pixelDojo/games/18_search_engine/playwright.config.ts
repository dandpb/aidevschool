import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./playwright",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4418",
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:4418",
    reuseExistingServer: false,
    timeout: 120_000,
  },
})

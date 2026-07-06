import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./playwright",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4413",
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:4413",
    reuseExistingServer: false,
    port: 4413,
    timeout: 120_000,
  },
})

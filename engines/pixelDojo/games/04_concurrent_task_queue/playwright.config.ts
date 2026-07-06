import { defineConfig } from "@playwright/test"

const baseURL = "http://127.0.0.1:4404"

export default defineConfig({
  testDir: "./playwright",
  timeout: 60_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})

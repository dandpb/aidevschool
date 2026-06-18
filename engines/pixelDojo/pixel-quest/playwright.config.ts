import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./playwright",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4176",
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: "pnpm run dev --port 4176",
    url: "http://127.0.0.1:4176",
    reuseExistingServer: !process.env["CI"],
  },
})

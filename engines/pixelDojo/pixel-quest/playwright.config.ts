import { defineConfig } from "@playwright/test"

const port = Number(process.env["PIXELQUEST_PORT"] ?? 4176)
const timeoutMs = Number(process.env["PIXELQUEST_TIMEOUT_MS"] ?? 30_000)
const workerCount = process.env["PIXELQUEST_WORKERS"]
  ? Number(process.env["PIXELQUEST_WORKERS"])
  : undefined

export default defineConfig({
  testDir: "./playwright",
  timeout: timeoutMs,
  workers: workerCount,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: `pnpm run dev --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env["CI"],
  },
})

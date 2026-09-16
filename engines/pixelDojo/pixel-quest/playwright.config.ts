import { defineConfig } from "@playwright/test"

const port = Number(process.env["PIXELQUEST_PORT"] ?? 4176)
// AID-2148: shared-runner evidence (AID-2113) — 30s ceiling starved 0/5 under
// load 35–44; 5/5 green with a 300s ceiling and 1 worker (slowest spec ~4.1m).
// Idle/dedicated machines still finish in seconds; the budget only binds under
// contention.
const timeoutMs = Number(process.env["PIXELQUEST_TIMEOUT_MS"] ?? 300_000)
const workerCount = Number(process.env["PIXELQUEST_WORKERS"] ?? 1)

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

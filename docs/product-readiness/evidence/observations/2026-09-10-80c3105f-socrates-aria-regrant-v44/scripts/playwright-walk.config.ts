import { defineConfig, devices } from "@playwright/test";

// AID-1334 re-anchor v44 — config LOCAL do walk de observação dojoToday contra
// a árvore 80c3105f (main d0f... + PR #335). Padrão v43 (AID-1295): config
// arquivada; para executar, copiar spec+config para
// engines/dojoToday/walk-a1334-local/ e rodar
// `npx playwright test --config walk-a1334-local/playwright-walk.config.ts`.
// Três servidores do harness de continuidade (padrão playwright.config.ts):
// 5180 canônica, 5181 day-N, 5182 day-N+1 (seam DOJOTODAY_TODAY_MODULE).
export default defineConfig({
  testDir: "./",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5180",
    timezoneId: "UTC",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5180 --strictPort",
      url: "http://127.0.0.1:5180",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5181 --strictPort",
      url: "http://127.0.0.1:5181",
      reuseExistingServer: false,
      timeout: 30_000,
      env: { DOJOTODAY_TODAY_MODULE: "playwright/fixtures/today.day-n.ts" },
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5182 --strictPort",
      url: "http://127.0.0.1:5182",
      reuseExistingServer: false,
      timeout: 30_000,
      env: { DOJOTODAY_TODAY_MODULE: "playwright/fixtures/today.day-n-plus-1.ts" },
    },
  ],
});

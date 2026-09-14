import { defineConfig, devices } from "@playwright/test";

// QA Lead AID-1914 — config LOCAL p/ walks dojoToday (:5180 canônica +
// :5181/:5182 fixtures day-N/day-N+1 via seam DOJOTODAY_TODAY_MODULE —
// mesmos webServers do harness do engine, AID-987/T1; gerenciados pelo
// próprio playwright p/ garantir ciclo de vida completo do walk).
export default defineConfig({
  testDir: ".",
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
  webServer: [
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5180 --strictPort",
      cwd: "../../../../../../../engines/dojoToday",
      url: "http://127.0.0.1:5180",
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5181 --strictPort",
      cwd: "../../../../../../../engines/dojoToday",
      url: "http://127.0.0.1:5181",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DOJOTODAY_TODAY_MODULE: "playwright/fixtures/today.day-n.ts",
      },
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5182 --strictPort",
      cwd: "../../../../../../../engines/dojoToday",
      url: "http://127.0.0.1:5182",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DOJOTODAY_TODAY_MODULE: "playwright/fixtures/today.day-n-plus-1.ts",
      },
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

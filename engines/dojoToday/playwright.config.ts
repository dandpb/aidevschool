import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  outputDir: "./test-results",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5180",
    // Date-only `asOf` strings parse at UTC midnight; a non-UTC browser
    // timezone would shift the rendered day (the continuity spec asserts
    // dates). Pin the context so the projection day is deterministic.
    timezoneId: "UTC",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5180 --strictPort",
      url: "http://127.0.0.1:5180",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    // AID-987/T1 continuity harness (2-builds, spec §2.1): two extra dev
    // servers serve the SAME app with the deterministic day-N / day-N+1
    // fixtures through the DOJOTODAY_TODAY_MODULE seam. The canonical
    // generated read model on 5180 stays untouched for the other specs.
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5181 --strictPort",
      url: "http://127.0.0.1:5181",
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        DOJOTODAY_TODAY_MODULE: "playwright/fixtures/today.day-n.ts",
      },
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5182 --strictPort",
      url: "http://127.0.0.1:5182",
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        DOJOTODAY_TODAY_MODULE: "playwright/fixtures/today.day-n-plus-1.ts",
      },
    },
  ],
});

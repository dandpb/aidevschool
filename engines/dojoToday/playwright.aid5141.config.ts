// AID-5141/W5: scoped capture config for the HUD alias evidence (single
// local dojoToday dev server; CI keeps using playwright.config.ts and its
// continuity/escape fixtures). Same retained-config pattern as
// codexdojo-os-prototype/playwright.aid5080.config.ts (AID-5080): committed
// so the exact capture runtime is reproducible and auditable, without
// booting the five-server readiness harness.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  testMatch: /hud-aliases\.spec\.ts/,
  outputDir: "./test-results-aid5141",
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5190",
    timezoneId: "UTC",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5190 --strictPort",
      url: "http://127.0.0.1:5190",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: "desktop-1280", use: { viewport: { width: 1280, height: 800 } } },
    {
      name: "mobile-375",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 667 } },
    },
  ],
});

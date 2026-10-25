// AID-5141/W5: scoped capture config for the HUD alias evidence (single
// local literacyDojo dev server; CI keeps using playwright.config.ts com a
// suíte completa dev+pwa). Mesmo padrão de config retida do
// codexdojo-os-prototype/playwright.aid5080.config.ts (AID-5080): commitada
// para que o runtime de captura exato seja reproduzível e auditável, sem
// bootar o build de preview do projeto pwa.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  testMatch: /hud-aliases\.spec\.ts/,
  outputDir: "./test-results-aid5141",
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://localhost:4175",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      // Mesmo guard anti-porta-viva do config principal (AID-867).
      command:
        "node scripts/e2e-port-guard.mjs --port 4175 --role app && VITE_LITERACY_E2E=1 npm run dev -- --port 4175 --strictPort",
      url: "http://localhost:4175",
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
  projects: [
    { name: "desktop-1280", use: { viewport: { width: 1280, height: 800 } } },
    {
      name: "mobile-360",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 740 } },
    },
  ],
});

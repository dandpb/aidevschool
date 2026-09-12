import { defineConfig, devices } from "@playwright/test";

// FPE AID-1295 — config LOCAL: walk de observação do re-anchor v43 contra a
// superfície vite do literacyDojo na main 25c0232f (padrão v42/AID-1265).
export default defineConfig({
  testDir: "./playwright-qa1295-local",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4190",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

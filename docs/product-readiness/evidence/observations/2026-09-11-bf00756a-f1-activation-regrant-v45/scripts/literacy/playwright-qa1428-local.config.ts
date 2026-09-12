import { defineConfig, devices } from "@playwright/test";

// QA AID-1428 — config LOCAL: walk de observação do re-anchor v45 contra a
// superfície vite do literacyDojo na branch do PR #342 (bf00756a).
export default defineConfig({
  testDir: "./qa-v45-obs",
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

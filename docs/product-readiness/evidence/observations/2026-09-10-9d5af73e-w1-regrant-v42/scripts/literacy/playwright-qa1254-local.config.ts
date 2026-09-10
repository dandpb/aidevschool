import { defineConfig, devices } from "@playwright/test";

// QA AID-1265 — config LOCAL: walk de observação do re-grant v42 contra a
// superfície vite do literacyDojo no head merged da main (padrão v30/v41).
export default defineConfig({
  testDir: "./playwright-qa1254-local",
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

import { defineConfig, devices } from "@playwright/test";

// FPE AID-1797 — config LOCAL: walk de observação do re-grant v48 contra o
// vite dev do literacyDojo na branch do PR #407 (c08f5fbb), porta 4190.
export default defineConfig({
  testDir: ".",
  timeout: 180_000,
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

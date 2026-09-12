import { defineConfig, devices } from "@playwright/test";

// QA AID-1265 — config LOCAL: walk de observação do re-grant v42 contra o
// preview do bundle piloto do OS no head merged da main (padrão v41).
export default defineConfig({
  testDir: "./playwright-qa1254-local",
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4180",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

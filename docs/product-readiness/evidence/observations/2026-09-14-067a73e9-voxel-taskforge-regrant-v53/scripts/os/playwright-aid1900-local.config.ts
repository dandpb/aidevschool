import { defineConfig, devices } from "@playwright/test";

// QA AID-1900 — config LOCAL: walk de observação do OS (re-grant v53, PR #421,
// árvore 067a73e9) contra o preview do bundle piloto na porta 4180.
export default defineConfig({
  testDir: ".",
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

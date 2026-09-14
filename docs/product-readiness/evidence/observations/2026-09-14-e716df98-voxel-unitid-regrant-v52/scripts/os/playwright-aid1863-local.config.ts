import { defineConfig, devices } from "@playwright/test";

// FPE AID-1863 — config LOCAL: walk de observação do re-grant v52 contra o
// preview do bundle piloto do OS na árvore do PR #412 (e716df98), porta 4180.
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

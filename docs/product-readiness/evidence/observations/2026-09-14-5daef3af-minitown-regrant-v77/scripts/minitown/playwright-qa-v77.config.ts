import { defineConfig, devices } from "@playwright/test";

// QA Lead AID-1954 — config LOCAL p/ walk de observação miniTown (vite dev
// :4197 no worktree 5daef3af, PR #432; sem webServer auto — servidor explícito).
export default defineConfig({
  testDir: ".",
  timeout: 240_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4197",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

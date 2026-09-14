import { defineConfig, devices } from "@playwright/test";

// QA Lead AID-1924 — config LOCAL p/ walk de observação miniTown (vite dev
// :5191 no worktree 650bcfdc, PR #427; sem webServer auto — servidor explícito).
export default defineConfig({
  testDir: ".",
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5191",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

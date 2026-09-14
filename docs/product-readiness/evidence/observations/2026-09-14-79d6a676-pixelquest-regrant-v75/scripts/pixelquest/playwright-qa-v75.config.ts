import { defineConfig, devices } from "@playwright/test";

// QA Lead AID-1943 — config LOCAL p/ walk de observação pixel-quest (vite dev
// :4183 no worktree 79d6a676, PR #430; sem webServer auto — servidor explícito).
export default defineConfig({
  testDir: ".",
  timeout: 240_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4183",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

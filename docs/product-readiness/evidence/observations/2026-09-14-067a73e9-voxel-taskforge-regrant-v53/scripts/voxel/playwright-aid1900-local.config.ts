import { defineConfig, devices } from "@playwright/test";

// QA AID-1900 — config LOCAL p/ walk voxelDojo (game-02 :5202 + game-04 :5204,
// vite dev do worktree 067a73e9; sem webServer auto — reuso explícito).
export default defineConfig({
  testDir: ".",
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

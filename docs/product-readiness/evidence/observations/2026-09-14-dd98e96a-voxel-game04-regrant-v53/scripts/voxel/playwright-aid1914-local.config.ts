import { defineConfig, devices } from "@playwright/test";

// QA Lead AID-1914 — config LOCAL p/ walk voxelDojo (game-04 :5204 + game-02
// :5173, vite dev do worktree 9aa3ec71; sem webServer auto — reuso explícito).
export default defineConfig({
  testDir: ".",
  timeout: 240_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5204",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

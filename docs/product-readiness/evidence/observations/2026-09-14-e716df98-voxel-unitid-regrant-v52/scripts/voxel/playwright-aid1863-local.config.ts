import { defineConfig, devices } from "@playwright/test";

// FPE AID-1863 — config LOCAL p/ walk voxelDojo (game-10 :5177 + game-02
// :5173, vite dev do worktree e716df98; sem webServer auto — reuso explícito).
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

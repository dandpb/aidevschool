import { defineConfig, devices } from "@playwright/test";

// QA AID-1900 — config LOCAL p/ walk pixel-quest (:5176 vite dev do worktree
// 067a73e9; sem webServer auto — reuso explícito).
export default defineConfig({
  testDir: ".",
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5176",
    viewport: { width: 1280, height: 900 },
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

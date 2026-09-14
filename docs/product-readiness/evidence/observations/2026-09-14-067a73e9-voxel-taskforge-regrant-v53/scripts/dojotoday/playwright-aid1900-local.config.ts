import { defineConfig, devices } from "@playwright/test";

// QA AID-1900 — config LOCAL: walk de observação dojoToday (re-grant v53,
// PR #421, árvore 067a73e9 = merge ref de 7e03b60f em a7939416). Superfícies
// :5180/:5181/:5182 servidas por vite dev do worktree (seam
// DOJOTODAY_TODAY_MODULE), sem webServer auto — reuso explícito.
export default defineConfig({
  testDir: ".",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5180",
    timezoneId: "UTC",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

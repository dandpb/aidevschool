import { defineConfig, devices } from "@playwright/test";

// FPE AID-1863 — config LOCAL p/ walks dojoToday (:5180/:5181/:5182 já
// servidos por vite dev separados; sem webServer auto — reuso explícito).
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

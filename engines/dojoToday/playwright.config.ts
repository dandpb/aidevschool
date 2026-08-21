import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  outputDir: "./test-results",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5180",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5180 --strictPort",
    url: "http://127.0.0.1:5180",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

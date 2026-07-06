import { defineConfig } from "@playwright/test";

const baseURL = "http://localhost:5202";

export default defineConfig({
  testDir: "./playwright",
  timeout: 60_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx vite --port 5202 --strictPort",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});

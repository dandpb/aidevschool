import { defineConfig } from "@playwright/test";

const baseURL = "http://localhost:5204";

export default defineConfig({
  testDir: "./playwright",
  timeout: 60_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx vite --port 5204 --strictPort",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

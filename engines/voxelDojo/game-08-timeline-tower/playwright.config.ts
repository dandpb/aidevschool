import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5208",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx vite --port 5208 --strictPort",
    url: "http://localhost:5208",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});

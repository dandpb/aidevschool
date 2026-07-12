import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./playwright",
  timeout: 60_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx vite --host 127.0.0.1 --port 5173 --strictPort",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

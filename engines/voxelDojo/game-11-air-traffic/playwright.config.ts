import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5211",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx vite --port 5211 --strictPort",
    url: "http://localhost:5211",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});

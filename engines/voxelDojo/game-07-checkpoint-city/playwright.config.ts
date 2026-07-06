import { defineConfig } from "@playwright/test";

const baseURL = "http://localhost:5207";

export default defineConfig({
  testDir: "./playwright",
  timeout: 60_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx vite --port 5207 --strictPort",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});

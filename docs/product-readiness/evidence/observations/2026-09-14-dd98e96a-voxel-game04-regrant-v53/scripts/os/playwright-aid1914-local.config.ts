import { defineConfig, devices } from "@playwright/test";

// QA Lead AID-1914 — config LOCAL: walk de observação do re-grant v53 contra o
// preview do bundle piloto do OS na árvore do re-anchor QA do PR #424, porta
// 4180 (webServer gerenciado pelo playwright; build:pilot já executado).
export default defineConfig({
  testDir: ".",
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4180",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command: "npx vite preview --host 127.0.0.1 --port 4180 --strictPort",
    cwd: "../../../../../../../engines/codexdojo-os-prototype",
    url: "http://127.0.0.1:4180",
    reuseExistingServer: false,
    timeout: 90_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

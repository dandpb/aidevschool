import { defineConfig } from "@playwright/test";

const appPort = process.env.LITERACY_E2E_APP_PORT ?? "4173";
const pwaPort = process.env.LITERACY_E2E_PWA_PORT ?? "4174";

export default defineConfig({
  testDir: "./playwright",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    viewport: { width: 360, height: 740 },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "app", testIgnore: /pwa\.spec\.ts/, use: { baseURL: `http://localhost:${appPort}` } },
    // O service worker só é registrado no build, então o PWA é testado no preview.
    { name: "pwa", testMatch: /pwa\.spec\.ts/, use: { baseURL: `http://localhost:${pwaPort}` } },
  ],
  webServer: [
    {
      command: `VITE_LITERACY_E2E=1 npm run dev -- --port ${appPort} --strictPort`,
      url: `http://localhost:${appPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // `vite build` direto: o conteúdo já foi gerado por pretest:e2e e regenerá-lo
      // aqui invalidaria o dev server que já está servindo a outra suíte.
      command: `npx vite build && npm run preview -- --port ${pwaPort} --strictPort`,
      url: `http://localhost:${pwaPort}`,
      // Sempre sobe um preview novo: reusar um servidor "vivo" de outra rodada
      // deixava o build velho (ou já encerrado) atender o teste de offline.
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});

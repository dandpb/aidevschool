import { defineConfig } from "@playwright/test";

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
    { name: "app", testIgnore: /pwa\.spec\.ts/, use: { baseURL: "http://localhost:4173" } },
    // O service worker só é registrado no build, então o PWA é testado no preview.
    { name: "pwa", testMatch: /pwa\.spec\.ts/, use: { baseURL: "http://localhost:4174" } },
  ],
  webServer: [
    {
      command: "npm run dev -- --port 4173 --strictPort",
      url: "http://localhost:4173",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // `vite build` direto: o conteúdo já foi gerado por pretest:e2e e regenerá-lo
      // aqui invalidaria o dev server que já está servindo a outra suíte.
      command: "npx vite build && npm run preview -- --port 4174 --strictPort",
      url: "http://localhost:4174",
      // Sempre sobe um preview novo: reusar um servidor "vivo" de outra rodada
      // deixava o build velho (ou já encerrado) atender o teste de offline.
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});

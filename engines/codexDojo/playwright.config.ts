import { defineConfig } from "@playwright/test"

// AID-1857/t1 — codexDojo e2e mínimo (vite preview, sem deploy externo).
// Deterministic contract (traço QW AID-1593): strictPort + no server reuse
// so a stale server on the port fails fast instead of serving the wrong
// build; retries stay 0 locally (CI appends `--retries=1 --trace
// on-first-retry` per the AID-1658 policy, mirroring literacyDojo).
const appPort = process.env.CODEXDOJO_E2E_APP_PORT ?? "4177"

export default defineConfig({
  testDir: "./playwright",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${appPort}`,
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    // `vite preview` serves the production build: the e2e exercises the
    // same artifacts a deploy would (AID-1857 escopo: "via vite preview").
    command: `pnpm run build && pnpm run preview --port ${appPort} --strictPort`,
    url: `http://127.0.0.1:${appPort}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})

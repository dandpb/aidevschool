import path from "node:path";
import { defineConfig } from "@playwright/test";

// E2E suite — runs against a dedicated dev server (port 3100) backed by a
// dedicated SQLite file (db/e2e.db). One shared database means serial
// execution: workers MUST stay 1.

export const E2E_PORT = 3100;
// Absolute path resolved at runtime — prisma treats relative `file:` URLs as
// schema-dir-relative, and a hardcoded machine path breaks every other box.
export const E2E_DB_URL = `file:${path
  .resolve(__dirname, "db", "e2e.db")
  .replace(/\\/g, "/")}`;

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 }, // dev server JIT-compiles pages on first hit
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    // localhost, not 127.0.0.1: Next dev blocks cross-origin chunk requests
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Production server, not dev: Next 16 allows only ONE dev server per
  // project dir, and the user runs one for manual testing. Requires a fresh
  // `npm run build` after app-code changes.
  webServer: {
    command: `npx next start -p ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
    env: { DATABASE_URL: E2E_DB_URL },
  },
});

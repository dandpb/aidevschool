import { defineConfig } from "vitest/config"

// Unit/contract suites live next to sources under src/. The browser e2e
// lives in playwright/ and runs via `pnpm run test:e2e` (Playwright), so it
// must stay out of the vitest include set (AID-1857/t1).
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
})

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    // We use explicit `import { describe, it, expect } from 'vitest'` in each
    // file rather than relying on globals, so this is left as-is for clarity.
    globals: false,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/__tests__/**',
        'src/**/*.d.ts',
        // The process entry point is exercised by `npm start` / Docker,
        // not by the in-process test suite. Keeping it out of the gate
        // means coverage reports reflect the library code we ship.
        'src/main.ts',
      ],
      thresholds: {
        // 80% lines is the project gate; the test suite clears it with margin.
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});

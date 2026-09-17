import path from "node:path";
import { defineConfig } from "vitest/config";

// Absolute sqlite path for the test database (prisma resolves `file:` URLs
// against the schema dir for relative paths, so keep this absolute).
const testDbPath = path
  .resolve(__dirname, "db", "test.db")
  .replace(/\\/g, "/");

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    // One shared sqlite file: tests must run serially.
    fileParallelism: false,
    env: {
      DATABASE_URL: `file:${testDbPath}`,
    },
    globalSetup: ["tests/global-setup.ts"],
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
  },
});

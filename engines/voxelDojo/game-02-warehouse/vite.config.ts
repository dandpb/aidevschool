/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5202,
    strictPort: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});

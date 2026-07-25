import { defineConfig } from "vite";

// Vanilla DOM, sem plugin de framework. O read model é gerado por
// tools/gen-today.py (roda no prebuild) a partir do substrato compartilhado.
export default defineConfig({
  build: {
    target: "es2022",
    outDir: "dist",
  },
  server: {
    port: 5180,
    strictPort: true,
  },
});

import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Vanilla DOM, sem plugin de framework. O read model é gerado por
// tools/gen-today.py (roda no prebuild) a partir do substrato compartilhado.
//
// Seam de teste mínima (AID-987/T1, spec §2.1): o harness de continuidade
// precisa servir a view com projeções dia-N / dia-N+1 SEM tocar o módulo
// gerado. Com DOJOTODAY_TODAY_MODULE apontando um fixture, o import
// "./data/today" é aliás para esse arquivo; SEM o env (builds normais, dev
// local, deploy), nenhum alias existe e o comportamento é inalterado.
const todayFixture = process.env.DOJOTODAY_TODAY_MODULE;

export default defineConfig({
  build: {
    target: "es2022",
    outDir: "dist",
  },
  server: {
    port: 5180,
    strictPort: true,
  },
  ...(todayFixture === undefined
    ? {}
    : {
        resolve: {
          alias: {
            "./data/today": fileURLToPath(new URL(todayFixture, import.meta.url)),
          },
        },
      }),
});

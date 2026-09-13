import { fileURLToPath } from "node:url"

// AID-1673 (hardening-top10 R3): the package declares no dependencies, so its
// suite runs from a consuming workspace's vitest install (CI uses the
// voxelDojo job). The root is pinned to this directory so the same invocation
// works from anywhere:
//   cd engines/voxelDojo && pnpm exec vitest run -c ../shared/teaching-evidence/vitest.config.ts
export default {
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
}

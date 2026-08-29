import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const engineRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(engineRoot, "../..");
if (process.env.READINESS_TEST_RUN !== "passed") {
  throw new Error("Run pnpm smoke; readiness reports require a passing Playwright run.");
}
const result = spawnSync(
  "python3",
  [
    "docs/product-readiness/tools/cli.py",
    "producer-report",
    "--engine",
    "engines/miniTown",
    "--output",
    "engines/miniTown/test-results/readiness",
    "--scenarios",
    "minitown-explore-only",
  ],
  { cwd: repoRoot, encoding: "utf8", stdio: "inherit" },
);

if (result.error !== undefined) throw result.error;
process.exitCode = result.status ?? 1;

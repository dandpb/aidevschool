import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const engineRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(engineRoot, "../..");
if (process.env.READINESS_TEST_RUN !== "passed") {
  throw new Error("Run npm run test:e2e; readiness reports require a passing Playwright run.");
}
const result = spawnSync(
  "python3",
  [
    "docs/product-readiness/tools/cli.py",
    "producer-report",
    "--engine",
    "engines/literacyDojo",
    "--output",
    "engines/literacyDojo/test-results/readiness",
    "--scenarios",
    "literacy-happy-path",
    "literacy-retry",
    "literacy-resume",
  ],
  { cwd: repoRoot, encoding: "utf8", stdio: "inherit" },
);

if (result.error !== undefined) throw result.error;
process.exitCode = result.status ?? 1;

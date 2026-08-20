import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const engineRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(engineRoot, "../..");
const result = spawnSync(
  "python3",
  [
    "docs/product-readiness/tools/cli.py",
    "producer-report",
    "--engine",
    "engines/pixelDojo",
    "--output",
    "engines/pixelDojo/test-results/readiness",
    "--scenarios",
    "pixelquest-encounter-evidence",
  ],
  { cwd: repoRoot, encoding: "utf8", stdio: "inherit" },
);

if (result.error !== undefined) throw result.error;
process.exitCode = result.status ?? 1;

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const engineRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(engineRoot, "../..");
if (process.env.READINESS_TEST_RUN !== "passed") {
  throw new Error("Run pnpm smoke; readiness reports require passing catalog Playwright runs.");
}
const catalog = JSON.parse(readFileSync(path.join(engineRoot, "catalog.json"), "utf8"));
const missingSmokeScripts = catalog
  .map(({ id }) => id)
  .filter((id) => {
    const packageJson = JSON.parse(readFileSync(path.join(engineRoot, id, "package.json"), "utf8"));
    return typeof packageJson.scripts?.smoke !== "string";
  });

if (missingSmokeScripts.length > 0) {
  console.error(`Cannot report voxelDojo readiness: missing smoke scripts for ${missingSmokeScripts.join(", ")}`);
  process.exitCode = 1;
  process.exit();
}

const result = spawnSync(
  "python3",
  [
    "docs/product-readiness/tools/cli.py",
    "producer-report",
    "--engine",
    "engines/voxelDojo",
    "--output",
    "engines/voxelDojo/test-results/readiness",
    "--scenarios",
    "voxel-standalone-loop",
  ],
  { cwd: repoRoot, encoding: "utf8", stdio: "inherit" },
);

if (result.error !== undefined) throw result.error;
process.exitCode = result.status ?? 1;

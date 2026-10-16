import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const execute = promisify(execFile);

const ENGINES = new Set([
  "aiDevschoolMvp", "codexDojo", "codexdojo-os-prototype", "dojoToday",
  "literacyDojo", "miniMaxEvolutionEngine", "miniTown", "minimaxDojo",
  "openclaw", "pixelDojo", "school-entry", "sdlc-quest", "voxelDojo",
  "zai-duolingo-like",
]);
const LITERACY_CASES = new Set([
  "last-passing-evidence", "verifier-outage-retry", "deployed-verifier",
]);
const LIVE_PREREQUISITES = {
  aiDevschoolMvp: [
    "A disposable native Hermes/OpenClaw profile and local-only delivery",
    "A fresh tutor session invoking the documented gates with all required JSON fields",
    "Digest-bound live G4 judgments, then scheduling/card/ledger and retry/return observations",
  ],
  miniMaxEvolutionEngine: [
    "A disposable complete checkout and authenticated native Claude sessions",
    "Five supervised phases with distinct producer/verifier contexts and explicit recovery",
    "The documented command surface must resolve in the native harness",
  ],
};

// This command executes observations. It never promotes a retained producer report
// into a new run, a semantic judgment, a ReadinessTier or canonical mastery.
export async function run(engineId, caseName = "declared-use") {
  assert.ok(ENGINES.has(engineId), `Unknown engineId: ${engineId}`);
  if (engineId === "literacyDojo" && LITERACY_CASES.has(caseName)) {
    return (await import("./literacy-runtime.mjs")).run(caseName);
  }
  assert.equal(caseName, "declared-use", `Unknown observation: ${engineId}/${caseName}`);
  if (["codexDojo", "dojoToday", "miniTown"].includes(engineId)) {
    return (await import("./dashboard-runtime.mjs")).run(engineId, caseName);
  }
  if (["codexdojo-os-prototype", "literacyDojo"].includes(engineId)) {
    return (await import("./learning-runtime.mjs")).run(engineId, caseName);
  }
  if (["school-entry", "sdlc-quest", "zai-duolingo-like"].includes(engineId)) {
    return (await import("./local-products-runtime.mjs")).run(engineId, caseName);
  }
  if (engineId === "pixelDojo") return (await import("./pixel-runtime.mjs")).run(caseName);
  if (engineId === "voxelDojo") return (await import("./voxel-runtime.mjs")).run(caseName);
  if (engineId === "minimaxDojo") return (await import("./minimax-local-runtime.mjs")).run(caseName);
  if (engineId === "openclaw") {
    const localPython = path.join(ROOT, ".scratch/gh-375/venv/bin/python");
    const python = process.env.READINESS_PYTHON ?? (existsSync(localPython) ? localPython : "python3");
    const script = fileURLToPath(new URL("./agent-runtime-openclaw.py", import.meta.url));
    const output = path.join(ROOT, ".scratch/readiness-implementation-20261015/qa-openclaw", new Date().toISOString().replaceAll(":", "-"));
    const args = [script, "--source-root", ROOT, "--output-dir", output, "--timeout", "30"];
    let stdout;
    try {
      ({ stdout } = await execute(python, args, { cwd: ROOT, timeout: 600_000, maxBuffer: 1_048_576 }));
    } catch (error) {
      if (!error.stdout?.trim()) throw error;
      stdout = error.stdout;
    }
    return { engineId, caseName, ...JSON.parse(stdout) };
  }
  return {
    engineId, caseName, status: "unverified", observedAt: new Date().toISOString(),
    kind: "prerequisite-check-only", runtimeExecuted: false,
    missingPrerequisites: LIVE_PREREQUISITES[engineId],
    limitations: [
      "No live session was started by this command. Native QA transcripts are separate historical evidence.",
      "This prerequisite result cannot settle the frozen declared-use criterion.",
    ],
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = await run(process.argv[2], process.argv[3] ?? "declared-use");
    console.log(JSON.stringify({
      engineId: result.engineId, caseName: result.caseName, status: result.status,
      runtimeStatus: result.runtimeStatus ?? result.functionalStatus,
      reportPath: result.reportPath ?? result.report,
      missingPrerequisites: result.missingPrerequisites,
      runtimeExecuted: result.runtimeExecuted,
    }, null, 2));
    process.exitCode = result.status === "pass" ? 0 : result.status === "blocked" ? 1 : 2;
  } catch (error) {
    console.error(JSON.stringify({ status: "unverified", error: String(error) }));
    process.exitCode = 2;
  }
}

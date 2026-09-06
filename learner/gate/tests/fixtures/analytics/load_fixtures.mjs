// Fixture loader for the vitest-side schema-drift check (AID-473 F2). The OS
// engine's typecheck has no node builtin types, so — following the F1 pattern
// of dojo-analytics-collector.d.mts — this loader runs on the node side and
// exports plain strings the vitest suite (fixtureSchemaDrift.test.ts) asserts
// against the canonical vocabulary in src/analytics/events.ts. Node builtins
// load lazily inside each function so importing this module from the jsdom
// test runner stays side-effect-free (same reason the F1 collector defers fs).

async function fsExtras() {
  const [fs, path] = await Promise.all([import("node:fs/promises"), import("node:path")]);
  return { fs, path };
}

function linesOf(raw) {
  return raw.split("\n").filter((line) => line.trim() !== "");
}

/** Every synthetic-collector line with file/line provenance, sorted by file. */
export async function syntheticFixtureLines() {
  const { fs, path } = await fsExtras();
  const files = (await fs.readdir(path.join(import.meta.dirname, "synthetic"))).sort();
  const lines = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(import.meta.dirname, "synthetic", file), "utf8");
    linesOf(raw).forEach((line, index) => lines.push({ file: path.basename(file), number: index + 1, line }));
  }
  return lines;
}

/** The committed drift-fixture lines (1 valid baseline + 11 drifted). */
export async function driftFixtureLines() {
  const { fs, path } = await fsExtras();
  const raw = await fs.readFile(path.join(import.meta.dirname, "drift/events-2026-08-05.ndjson"), "utf8");
  return linesOf(raw);
}

/** Raw committed example report (JSON) for staleness/anonymity checks. */
export async function exampleReportRaw() {
  const { fs, path } = await fsExtras();
  return fs.readFile(path.join(import.meta.dirname, "example-funnel-report.json"), "utf8");
}

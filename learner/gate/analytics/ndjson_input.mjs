// Shared input surface for the offline analytics tools (AID-473 F2).
//
// The F1 collector (learner/gate/netlify-functions/dojo-analytics-collector.mjs)
// appends accepted events as one JSON envelope per line to UTC day-rotated
// files named events-YYYY-MM-DD.ndjson. These helpers expand a directory (or
// explicit file list) into a deterministic, line-addressable stream so the
// aggregation script and the schema-drift monitor read exactly the same input.
//
// Boundary: analytics is not evidence. Nothing here touches learner state,
// gates, or mastery; the raw envelopes are pseudonymous (installationId +
// sessionId) and never leave the operator's machine through this code.

import { readdir, readFile, stat } from "node:fs/promises";
import { basename, isAbsolute, join, resolve } from "node:path";

/** Expand input paths (directories or .ndjson files) into a sorted file list. */
export async function collectInputFiles(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error("no input paths given: pass one or more .ndjson files or directories");
  }
  const files = [];
  for (const input of inputs) {
    const path = resolve(input);
    const info = await stat(path).catch(() => {
      throw new Error(`input path not found: ${path}`);
    });
    if (info.isDirectory()) {
      const entries = (await readdir(path)).filter((name) => name.endsWith(".ndjson")).sort();
      for (const entry of entries) files.push(join(path, entry));
    } else if (info.isFile()) {
      if (!path.endsWith(".ndjson")) {
        throw new Error(`input file is not .ndjson: ${path}`);
      }
      files.push(path);
    } else {
      throw new Error(`input path is neither file nor directory: ${path}`);
    }
  }
  if (files.length === 0) {
    throw new Error("no .ndjson input files found");
  }
  return files;
}

/**
 * Read NDJSON files into line-addressable entries.
 * Every line keeps file/line provenance; parse failures never throw — the
 * schema-drift monitor is the component that fails high on bad input.
 *
 * @returns {{ files: Array<{name: string, lines: number, entries: Array<object>}>,
 *             entries: Array<{file: string, line: number, text: string,
 *                              value?: object, parseError?: string}> }}
 */
export async function readNdjsonEntries(files) {
  const perFile = [];
  const entries = [];
  for (const path of files) {
    const name = basename(path);
    const raw = await readFile(path, "utf8");
    const fileEntries = [];
    const lines = raw.length === 0 ? [] : raw.split("\n");
    // A trailing newline yields one empty tail element; drop it, but keep
    // interior blank lines addressable so malformed files stay debuggable.
    if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    let lineNumber = 0;
    for (const text of lines) {
      lineNumber += 1;
      const entry = { file: name, line: lineNumber, text };
      const trimmed = text.trim();
      if (trimmed === "") {
        entry.parseError = "blank-line";
      } else {
        try {
          entry.value = JSON.parse(trimmed);
        } catch (error) {
          entry.parseError = error instanceof Error ? error.message : String(error);
        }
      }
      fileEntries.push(entry);
      entries.push(entry);
    }
    perFile.push({ name, lines: fileEntries.length, entries: fileEntries });
  }
  return { files: perFile, entries };
}

/** Resolve a report path relative to cwd (or null when unset). */
export function resolveOutput(path) {
  return typeof path === "string" && path.length > 0 ? (isAbsolute(path) ? path : resolve(path)) : null;
}

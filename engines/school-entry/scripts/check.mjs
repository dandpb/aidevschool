import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

let count = 0;
for (const directory of ["server", "public", "scripts", "tests"]) {
  for (const entry of await readdir(directory)) {
    if (!/\.(mjs|js)$/.test(entry)) continue;
    const result = spawnSync(
      process.execPath,
      ["--check", resolve(directory, entry)],
      { stdio: "inherit" },
    );
    if (result.status !== 0) process.exit(result.status || 1);
    count++;
  }
}
console.log(`Syntax checked: ${count} modules.`);

// Vitest global setup: (re)create the test sqlite database from the Prisma
// schema. Runs once per `vitest run` in the main process; the same
// DATABASE_URL is injected into test workers via vitest.config.ts `test.env`.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export default async function setup() {
  const root = path.resolve(__dirname, "..");
  const dbPath = path.join(root, "db", "test.db");
  fs.rmSync(dbPath, { force: true });
  const url = `file:${dbPath.replace(/\\/g, "/")}`;
  execSync("npx prisma db push --skip-generate", {
    cwd: root,
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}

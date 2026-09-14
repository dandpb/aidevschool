// Offline self-test for the flaky-ledger parser (AID-1857/t2). Fixtures are
// synthetic Playwright list-reporter job logs (with GitHub Actions log
// timestamps) that MUST extract exactly the expected entries — including the
// zero-flaky case and the flaky-count>0-but-no-entries corruption case.
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURES = join(HERE, "fixtures")

function check(condition, label) {
  if (condition) {
    console.log(`  ok - ${label}`)
    return true
  }
  console.error(`  FAIL - ${label}`)
  return false
}

export async function runSelfTest({ parseFlakyEntries }) {
  let ok = true

  const clean = readFileSync(join(FIXTURES, "clean-success.log"), "utf8")
  ok = check(parseFlakyEntries(clean).length === 0, "clean success log: 0 entries") && ok

  const single = parseFlakyEntries(readFileSync(join(FIXTURES, "flaky-single.log"), "utf8"))
  ok =
    check(single.length === 1, "flaky-single: 1 entry") &&
    check(
      single[0]?.test_file === "playwright/pixel-quest.spec.ts" &&
        single[0]?.project === "[chromium]" &&
        single[0]?.title === "plays the PixelDojo curriculum quest slice and advances labs",
      "flaky-single: parsed file/project/title",
    ) &&
    ok

  const multi = parseFlakyEntries(readFileSync(join(FIXTURES, "flaky-multi.log"), "utf8"))
  ok =
    check(multi.length === 2, "flaky-multi: 2 entries") &&
    check(
      multi[0]?.test_id === "[chromium] › e2e/reflow-320.spec.ts:14:3 › reflow › vertical slice holds at 320px",
      "flaky-multi: first test_id preserved verbatim",
    ) &&
    check(multi[1]?.title === "offline: service worker serves the shell", "flaky-multi: second title") &&
    ok

  const zeroCount = readFileSync(join(FIXTURES, "flaky-zero-count.log"), "utf8")
  ok = check(parseFlakyEntries(zeroCount).length === 0, "flaky-zero-count: 0 entries") && ok

  if (ok) {
    console.log("flaky-ledger self-test: PASS")
  } else {
    console.error("flaky-ledger self-test: REGRESSION")
  }
  return ok
}

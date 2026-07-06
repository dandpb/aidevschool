import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

// Smoke test for the Raft Ring wave. Drives a clean PASS via real keyboard
// input — elects the initial leader, dispatches 4 jobs, injects the canonical
// 2|3 partition, elects the new majority-side leader, dispatches the final
// 4 jobs, then asserts the EVIDENCE line.
//
// Deterministic pass path (per docs/plans/12_distributed_job_scheduler.md §4):
//   1. V on N0           -> leader N0, token 1
//   2. SPACE x4          -> 4 jobs dispatched (workers advance 0 -> 1)
//   3. P                 -> partition {N0,N1} | {N2,N3,4}
//   4. Tab Tab           -> target N2 (majority side)
//   5. V on N2           -> leader N2, token 2 (workers still at 1)
//   6. SPACE x4          -> 4 more jobs dispatched (workers advance 1 -> 2)
//   7. (auto-resolve)    -> all 8 dispatched, evidence emitted

const here = dirname(fileURLToPath(import.meta.url))
const shotsDir = join(here, "..", "shots")
const evidencePath = join(here, "..", "evidence.json")

test("plays the Raft Ring wave and emits PASS evidence", async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text())
    }
  })

  const evidenceMessages: string[] = []
  page.on("console", (message) => {
    if (message.text().startsWith("EVIDENCE ")) {
      evidenceMessages.push(message.text())
    }
  })

  await page.goto("/")
  await expect(page.locator("canvas")).toBeVisible()
  await expect(page.locator(".hud-title")).toContainText("Raft Ring")
  await expect(page.locator(".hud-briefing").first()).toContainText("fencing-token")

  // Initial leader election on node 0 (the default focus target).
  await page.keyboard.press("v")
  // Wait for the election pulse window to settle (avoid swallowing the next
  // keypress in the same frame).
  await page.waitForTimeout(50)

  // Dispatch the first 4 jobs from the canonical leader (N0, token 1).
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press(" ")
    await page.waitForTimeout(30)
  }

  // Inject the canonical partition.
  await page.keyboard.press("p")
  await page.waitForTimeout(50)

  // Move focus to N2 (Tab cycles N0 -> N1 -> N2). The majority side {N2, N3,
  // N4} is the only side that can elect a new leader.
  await page.keyboard.press("Tab")
  await page.waitForTimeout(30)
  await page.keyboard.press("Tab")
  await page.waitForTimeout(30)

  // Elect the new leader on the majority side (token 2).
  await page.keyboard.press("v")
  await page.waitForTimeout(50)

  // Dispatch the remaining 4 jobs from the new leader.
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press(" ")
    await page.waitForTimeout(30)
  }

  // The auto-resolve emits the EVIDENCE line. Poll for it.
  await expect
    .poll(async () => evidenceMessages.length, { timeout: 8000 })
    .toBeGreaterThanOrEqual(1)

  const evidenceLine = evidenceMessages[0]
  if (evidenceLine === undefined) {
    throw new Error("EVIDENCE line was not captured before assertion")
  }
  expect(evidenceLine).toMatch(/^EVIDENCE /)
  const record = JSON.parse(evidenceLine.replace(/^EVIDENCE /, ""))
  expect(record.schema).toBe("12_distributed_job_scheduler-v1")
  expect(record.unit_id).toBe("12_distributed_job_scheduler")
  expect(record.project).toBe("12_distributed_job_scheduler")
  expect(record.encounter_id).toBe("raft-ring-01")
  expect(record.game).toBe("Raft Ring")
  expect(record.pass).toBe(true)
  expect(Date.now() - Date.parse(record.ts)).toBeLessThan(10_000)
  expect(Array.isArray(record.gates)).toBe(true)
  for (const gate of record.gates) {
    expect(gate.passed).toBe(true)
  }

  const metrics = record.metrics
  expect(metrics.jobs_queued).toBe(8)
  expect(metrics.successful_dispatches).toBe(8)
  expect(metrics.stale_token_accepted).toBe(0)
  expect(metrics.duplicate_dispatches).toBe(0)
  expect(metrics.non_leader_dispatch_attempts).toBe(0)
  expect(metrics.queue_stall_secs).toBeLessThanOrEqual(5)
  expect(metrics.elections_started).toBeGreaterThanOrEqual(2)
  expect(metrics.elections_won_with_quorum).toBeGreaterThanOrEqual(2)
  expect(metrics.partitions_injected).toBeGreaterThanOrEqual(1)
  expect(metrics.max_term_reached).toBeGreaterThanOrEqual(2)

  expect(record.curriculum_context).toMatchObject({
    concept:
      "simplified-Raft leader election with quorum + fencing-token dispatch under split-brain",
    mechanic: "Raft Ring",
  })
  expect(record.review_context).toMatchObject({
    unit_kind: "concept",
    scheduled_review: false,
    review_reason: "deepening",
    scheduler_source: "learner-substrate",
    verifier_required: true,
  })

  // Side-effect contract: producer never publishes learning-state channels
  // and never touches learner storage.
  const sideEffects = await page.evaluate(() => ({
    gameEvidenceSet: "__gameEvidence" in window,
    learningStatePublished: "__pixelQuestLearningState" in window,
    lsKeys: Object.keys(localStorage),
  }))
  expect(sideEffects.gameEvidenceSet).toBe(true)
  expect(sideEffects.learningStatePublished).toBe(false)
  expect(sideEffects.lsKeys).not.toContain("learning_state")
  expect(sideEffects.lsKeys).not.toContain("units_log")
  expect(sideEffects.lsKeys).not.toContain("mastered")

  await expect(page.locator(".hud-banner.pass")).toBeVisible()
  mkdirSync(shotsDir, { recursive: true })
  await page.screenshot({
    path: join(shotsDir, "12_distributed_job_scheduler.png"),
    fullPage: true,
  })
  // Persist the EVIDENCE json for the verifier handoff + .loops output dir.
  writeFileSync(evidencePath, `${JSON.stringify(record, null, 2)}\n`, "utf8")
  expect(runtimeErrors).toEqual([])
})

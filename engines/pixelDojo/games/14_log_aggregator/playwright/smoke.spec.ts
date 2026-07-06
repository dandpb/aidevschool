import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

// Smoke test for the Log River Delta wave (river-delta-L1). Drives the
// deterministic defaultWave() (src/game/wave.ts) to a PASS via real keyboard
// input. Wave shape:
//
//   - 4 bursts, 12 droplets each (48 spawn attempts, 5 duplicates)
//   - contract 1: query level=error  → matches the single payments error log
//   - contract 2: trace corr_42      → 4 spans across checkout+payments+inventory
//
// Drive: B×4 (batch every burst, zero overflow) → wait for indexer freshness
// + cold-tier aging → E×5 Z (contract 1) → F×2 E Z T (contract 2) → EVIDENCE.

const here = dirname(fileURLToPath(import.meta.url))
const shotsDir = join(here, "..", "shots")
const logsDir = join(here, "..", ".logs")

test("plays the Log River Delta wave and emits PASS evidence", async ({ page }) => {
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
  await expect(page.locator(".hud-title")).toContainText("Log River Delta")
  await expect(page.locator(".hud-line .value").first()).toContainText("14_log_aggregator")
  await expect(page.locator("[data-phase]")).toContainText("INGEST")

  // 1) Batch all 4 bursts. Each B admits one burst as 1 weir slot — zero overflow.
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press("b")
    await page.waitForTimeout(60)
  }
  await expect(page.locator("[data-metrics]")).toContainText("logs accepted")
  await expect(page.locator("[data-metrics]")).toContainText("43") // 48 - 5 duplicates

  // 2) Wait for indexer-freshness budget + cold-tier aging so the contract
  //    phase appears and compression reaches ≥ 3:1 by the time we finish.
  await page.waitForTimeout(2800)
  await expect(page.locator("[data-phase]")).toContainText("QUERY")
  await expect(page.locator("[data-contract]")).toContainText("ERROR")

  // 3) Contract 1 — filter level=error. Default dimension is level, press E
  //    five times to cycle null → trace → debug → info → warn → error.
  for (let i = 0; i < 5; i += 1) {
    await page.keyboard.press("e")
    await page.waitForTimeout(40)
  }
  await page.keyboard.press("z")
  // Contract 1 advances on a correct query; contract 2 (trace) appears.
  await expect(page.locator("[data-contract]")).toContainText("corr_42", { timeout: 4000 })

  // 4) Contract 2 — trace corr_42. Cycle dimension level → source →
  //    correlation (F×2), then pick corr_42 (E), query (Z), assemble (T).
  await page.keyboard.press("f")
  await page.waitForTimeout(40)
  await page.keyboard.press("f")
  await page.waitForTimeout(40)
  await page.keyboard.press("e") // null → corr_42 (first in WAVE_CORRELATIONS)
  await page.waitForTimeout(40)
  await page.keyboard.press("z") // magnetize the 4 trace droplets
  await page.waitForTimeout(200)
  await page.keyboard.press("t") // drop into the Trace Tower

  // 5) Wave finished — EVIDENCE line captured.
  await expect
    .poll(async () => evidenceMessages.length, { timeout: 5000 })
    .toBeGreaterThanOrEqual(1)

  const evidenceLine = evidenceMessages[0]
  if (evidenceLine === undefined) {
    throw new Error("EVIDENCE line was not captured before assertion")
  }
  expect(evidenceLine).toMatch(/^EVIDENCE /)
  const record = JSON.parse(evidenceLine.replace(/^EVIDENCE /, ""))
  expect(record.schema).toBe("14_log_aggregator-v1")
  expect(record.unit_id).toBe("14_log_aggregator")
  expect(record.project).toBe("14_log_aggregator")
  expect(record.encounter_id).toBe("river-delta-L1")
  expect(record.game).toBe("Log River Delta")
  expect(record.pass).toBe(true)
  expect(Date.now() - Date.parse(record.ts)).toBeLessThan(10_000)
  expect(Array.isArray(record.gates)).toBe(true)
  for (const gate of record.gates) {
    expect(gate.passed).toBe(true)
  }

  const metrics = record.metrics
  expect(metrics.logs_accepted).toBe(43)
  expect(metrics.backpressure_rejects).toBe(0)
  expect(metrics.duplicates_detected).toBe(5)
  expect(metrics.duplicates_double_counted).toBe(0)
  expect(metrics.queries_correct).toBe(1)
  expect(metrics.queries_wrong_filter).toBe(0)
  expect(metrics.queries_too_broad).toBe(0)
  expect(metrics.traces_requested).toBe(1)
  expect(metrics.traces_reconstructed_correctly).toBe(1)
  expect(metrics.traces_out_of_order).toBe(0)
  expect(metrics.trace_span_services_spanned).toBe(3)
  expect(metrics.required_logs_expired_before_query).toBe(0)
  expect(metrics.compression_ratio).toBeGreaterThanOrEqual(3.0)
  expect(metrics.starvation_events).toBe(0)

  // Side-effect contract: the producer never publishes learning-state
  // channels and never touches learner storage.
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
    path: join(shotsDir, "14_log_aggregator.png"),
    fullPage: true,
  })

  // Persist the evidence record for the verifier + the output copy step.
  mkdirSync(logsDir, { recursive: true })
  writeFileSync(join(logsDir, "evidence.json"), JSON.stringify(record, null, 2), "utf8")

  expect(runtimeErrors).toEqual([])
})

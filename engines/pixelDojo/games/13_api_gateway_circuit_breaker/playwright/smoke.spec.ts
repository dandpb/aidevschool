import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

// Smoke test for the Breaker Grid wave. Drives the deterministic
// defaultWave() (src/game/wave.ts) through the full cycle
// CLOSED -> OPEN -> HALF_OPEN -> CLOSED via real keyboard input.
//
// Wave 1 (threshold=0.5, min_requests=4, cooldown=1500ms, probes=3):
//   CLOSED phase: 4 pulses (failures at 3,4 -> 2/4=50% crosses threshold).
//     Z, Z, Z, Z  (admit all 4; after #4 the TRIP cue flashes)
//     C           (TRIP -> OPEN, cooldown lights)
//   OPEN phase: 3 pulses (fail-fast to fallback).
//     X, X, X     (reject all 3)
//     [wait for cooldown to drain ~1500ms]
//     C           (PROBE -> HALF_OPEN, 3 probe slots)
//   HALF_OPEN phase: 5 pulses (2 regular-traffic rejects + 3 probes).
//     X           (pulse 8: regular traffic -> reject)
//     Z           (pulse 9: probe slot 1, success)
//     X           (pulse 10: regular traffic -> reject)
//     Z           (pulse 11: probe slot 2, success)
//     Z           (pulse 12: probe slot 3, success -> auto-close)
//     C           (CLOSE seal — optional, auto-close already happened)

const here = dirname(fileURLToPath(import.meta.url))
const shotsDir = join(here, "..", "shots")

test("plays the Breaker Grid wave and emits PASS evidence", async ({ page }) => {
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
  await expect(page.locator(".hud-title")).toContainText("Breaker Grid")
  await expect(page.locator(".hud-briefing").first()).toContainText("Circuit-breaker state machine")

  // CLOSED phase: admit 4 pulses (failures at #3, #4 cross the threshold).
  for (const key of ["z", "z", "z", "z"]) {
    await page.keyboard.press(key)
  }
  // Verify the trip cue is now active.
  await expect(page.locator("[data-phase]")).toContainText("TRIP NOW")
  // TRIP -> OPEN.
  await page.keyboard.press("c")
  await expect(page.locator("[data-state]")).toContainText("OPEN")

  // OPEN phase: reject 3 pulses to the fallback bank.
  for (const key of ["x", "x", "x"]) {
    await page.keyboard.press(key)
  }

  // Wait for the cooldown to drain (1500ms + margin).
  await expect
    .poll(async () => page.evaluate(() => window.__breakerDebug?.cooldownDone()), {
      timeout: 5000,
    })
    .toBe(true)

  // PROBE -> HALF_OPEN.
  await page.keyboard.press("c")
  await expect(page.locator("[data-state]")).toContainText("HALF_OPEN")

  // HALF_OPEN phase: reject regular traffic, admit 3 probes.
  // Pulse 8: regular traffic -> REJECT.
  await page.keyboard.press("x")
  // Pulse 9: probe slot 1 -> ADMIT (success).
  await page.keyboard.press("z")
  // Pulse 10: regular traffic -> REJECT.
  await page.keyboard.press("x")
  // Pulse 11: probe slot 2 -> ADMIT (success).
  await page.keyboard.press("z")
  // Pulse 12: probe slot 3 -> ADMIT (success, auto-closes the breaker).
  await page.keyboard.press("z")

  // The last probe emits the evidence record synchronously. Poll for the line.
  await expect
    .poll(async () => evidenceMessages.length, { timeout: 5000 })
    .toBeGreaterThanOrEqual(1)

  const evidenceLine = evidenceMessages[0]
  if (evidenceLine === undefined) {
    throw new Error("EVIDENCE line was not captured before assertion")
  }
  expect(evidenceLine).toMatch(/^EVIDENCE /)
  const record = JSON.parse(evidenceLine.replace(/^EVIDENCE /, ""))
  expect(record.schema).toBe("13_api_gateway_circuit_breaker-v1")
  expect(record.unit_id).toBe("13_api_gateway_circuit_breaker")
  expect(record.encounter_id).toBe("breaker-grid-01")
  expect(record.game).toBe("Breaker Grid")
  expect(record.pass).toBe(true)
  expect(Date.now() - Date.parse(record.ts)).toBeLessThan(10_000)
  expect(Array.isArray(record.gates)).toBe(true)
  for (const gate of record.gates) {
    expect(gate.passed).toBe(true)
  }

  const metrics = record.metrics
  expect(metrics.closed_admits_total).toBe(4)
  expect(metrics.closed_admits_correct).toBe(4)
  expect(metrics.trips_correct).toBe(1)
  expect(metrics.trips_late).toBe(0)
  expect(metrics.trips_early).toBe(0)
  expect(metrics.open_rejects_total).toBe(3)
  expect(metrics.open_rejects_correct).toBe(3)
  expect(metrics.open_leaks).toBe(0)
  expect(metrics.probes_total).toBe(3)
  expect(metrics.probes_correct).toBe(3)
  expect(metrics.probes_premature).toBe(0)
  expect(metrics.halfopen_admit_leaks).toBe(0)
  expect(metrics.closes_correct).toBe(1)
  expect(metrics.reactor_overloads).toBe(0)
  expect(metrics.overflow).toBe(false)

  // Side-effect contract (EVIDENCE_CONTRACT.md, plan slice §11): the producer
  // never publishes learning-state channels and never touches learner storage.
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
    path: join(shotsDir, "13_api_gateway_circuit_breaker.png"),
    fullPage: true,
  })
  expect(runtimeErrors).toEqual([])
})

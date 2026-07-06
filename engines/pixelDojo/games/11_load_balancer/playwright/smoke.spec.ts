import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

// Smoke test for the Traffic Forge wave. Drives the deterministic
// defaultWave() (src/game/wave.ts) to a PASS via real keyboard input.
//
// Wave order + required algorithm:
//   1-3 plain  → 1 (RR), Space
//   4-5 heavy  → 2 (LC), Space
//   6-7 sticky → 3 (CH), Space
//   8   plain  → 1 (RR), Space   -- mid-flight pillar death, must press R
//   9   heavy  → 2 (LC), Space
//   10  sticky → 3 (CH), Space
//
// Pillar P2 starts unhealthy; orb 8's target pillar dies mid-flight at +800ms
// after firing, so the player must press R within the 5s retry window.

const here = dirname(fileURLToPath(import.meta.url))
const shotsDir = join(here, "..", "shots")
const logsDir = join(here, "..", ".logs")

async function waitForPhase(page: import("@playwright/test").Page, phase: string) {
  await expect
    .poll(
      async () => {
        const p = await page.evaluate(() => window.__trafficForgeDebug?.phase() ?? "")
        return p
      },
      { timeout: 8000, intervals: [100, 250, 500] },
    )
    .toBe(phase)
}

test("plays the Traffic Forge wave and emits PASS evidence", async ({ page }) => {
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
  await expect(page.locator(".hud-title")).toContainText("Traffic Forge")

  // Each orb: pick the right algorithm (1/2/3) and fire (Space). Then wait for
  // phase === "idle" before the next orb. The wave starts under RR (default).
  // Orbs 1-3: plain under RR.
  for (let i = 0; i < 3; i += 1) {
    if (i > 0) {
      await waitForPhase(page, "idle")
    }
    await page.keyboard.press("1")
    await page.keyboard.press("Space")
  }
  await waitForPhase(page, "idle")

  // Orbs 4-5: heavy under LC.
  for (let i = 0; i < 2; i += 1) {
    await page.keyboard.press("2")
    await page.keyboard.press("Space")
    await waitForPhase(page, "idle")
  }

  // Orbs 6-7: sticky under CH.
  for (let i = 0; i < 2; i += 1) {
    await page.keyboard.press("3")
    await page.keyboard.press("Space")
    await waitForPhase(page, "idle")
  }

  // Orb 8: plain under RR — mid-flight death → stall → retry.
  await page.keyboard.press("1")
  await page.keyboard.press("Space")
  await waitForPhase(page, "stalled")
  await page.keyboard.press("r")
  await waitForPhase(page, "idle")

  // Orb 9: heavy under LC.
  await page.keyboard.press("2")
  await page.keyboard.press("Space")
  await waitForPhase(page, "idle")

  // Orb 10: sticky under CH.
  await page.keyboard.press("3")
  await page.keyboard.press("Space")

  // Wave resolves → phase "finished" + EVIDENCE console line.
  await expect
    .poll(async () => evidenceMessages.length, { timeout: 8000 })
    .toBeGreaterThanOrEqual(1)

  const evidenceLine = evidenceMessages[0]
  if (evidenceLine === undefined) {
    throw new Error("EVIDENCE line was not captured before assertion")
  }
  expect(evidenceLine).toMatch(/^EVIDENCE /)
  const record = JSON.parse(evidenceLine.replace(/^EVIDENCE /, ""))
  expect(record.schema).toBe("11_load_balancer-v1")
  expect(record.unit_id).toBe("11_load_balancer")
  expect(record.project).toBe("11_load_balancer")
  expect(record.encounter_id).toBe("traffic-forge-01")
  expect(record.game).toBe("Traffic Forge")
  expect(record.pass).toBe(true)
  expect(Date.now() - Date.parse(record.ts)).toBeLessThan(15_000)
  expect(Array.isArray(record.gates)).toBe(true)
  for (const gate of record.gates) {
    expect(gate.passed).toBe(true)
  }

  const metrics = record.metrics
  expect(metrics.orbs_total).toBe(10)
  expect(metrics.orbs_landed).toBe(10)
  expect(metrics.dead_routes).toBe(0)
  expect(metrics.sticky_breaks).toBe(0)
  expect(metrics.heavy_overflows).toBe(0)
  expect(metrics.orbs_lost).toBe(0)
  expect(metrics.failover_recovered).toBeGreaterThanOrEqual(1)
  expect(metrics.algorithms_used).toContain("round_robin")
  expect(metrics.algorithms_used).toContain("least_connections")
  expect(metrics.algorithms_used).toContain("consistent_hash")
  expect(metrics.wave_cleared).toBe(true)

  expect(record.curriculum_context.concept).toContain("reverse-proxy load balancing")
  expect(record.curriculum_context.mechanic).toContain("Traffic Forge")
  expect(record.review_context.unit_kind).toBe("concept")
  expect(record.review_context.scheduled_review).toBe(false)
  expect(record.review_context.scheduler_source).toBe("learner-substrate")
  expect(record.review_context.verifier_required).toBe(true)

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
    path: join(shotsDir, "11_load_balancer.png"),
    fullPage: true,
  })

  // Persist the evidence record for the verifier + the output copy step.
  mkdirSync(logsDir, { recursive: true })
  writeFileSync(join(logsDir, "evidence.json"), JSON.stringify(record, null, 2), "utf8")

  expect(runtimeErrors).toEqual([])
})

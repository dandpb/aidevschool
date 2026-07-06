import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { expect, test } from "@playwright/test"

// Timeline Tower smoke spec.
//
// Drives the event-sourced order lifecycle end-to-end through the 3D scene:
// 3 complete orders (3x6 lifecycle events = 18 events), at least one rejected
// invalid transition test, the publisher toggled briefly off then back on
// (so the player feels the projection lag and the catch-up drain), and a
// final projection query that confirms the sphere matches the tower top.
//
// On level clear the scene emits one EVIDENCE console line; this spec
// captures it, asserts the contract, and writes a screenshot.

const evidenceLogPath = join(
  dirname(new URL(import.meta.url).pathname),
  "..",
  ".logs",
  "evidence.ndjson",
)

test("drives the Timeline Tower lifecycle and emits valid EVIDENCE", async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text())
    }
  })

  const evidenceLines: string[] = []
  page.on("console", (message) => {
    const text = message.text()
    if (text.startsWith("EVIDENCE ")) {
      evidenceLines.push(text.slice("EVIDENCE ".length))
    }
  })

  await page.goto("/")
  const canvas = page.locator("canvas")
  await expect(canvas).toBeVisible()
  await expect(page.locator(".objective-chip")).toContainText("TIMELINE TOWER")
  await expect(page.locator(".objective-chip")).toContainText("Event-sourced order lifecycle")
  await expect(page.locator(".prompt-strip")).toContainText("Append next event")

  // Drive 3 full order lifecycles (each = 6 SPACE presses) + at least one
  // invalid transition test (X). After each delivered order the next SPACE
  // auto-starts a new order — no extra input needed.
  for (let order = 0; order < 3; order += 1) {
    // Order 0: drive normally (6 events).
    // Order 1: append OrderCreated first, then X to test rejection mid-lifecycle.
    // Order 2: toggle publisher off mid-order to create projection lag, then
    //          back on to drain (exercises the catch-up path).
    let appended = 0
    for (let step = 0; step < 6; step += 1) {
      if (order === 2 && appended === 0) {
        await page.keyboard.press("KeyE") // publisher off — projection will lag
      }
      await page.keyboard.press("Space")
      await page.waitForTimeout(60)
      appended += 1
      if (order === 1 && appended === 1) {
        // state=created; X tries a kind that's NOT PaymentAuthorized (the
        // next-valid) — the tower MUST reject it.
        await page.keyboard.press("KeyX")
        await expect(page.locator(".flash.reject")).toBeVisible()
        await page.waitForTimeout(300)
      }
      if (order === 2 && appended === 6) {
        // Last event of order 2 appended with publisher off; toggle back on
        // so the outbox drains and the projection catches up before query.
        await page.keyboard.press("KeyE") // publisher back on -> drain
      }
    }
  }

  // Optional replay (L1 does not require it, but it must not break the level).
  await page.keyboard.press("KeyQ")
  await page.waitForTimeout(200)

  // Final projection query — triggers win evaluation when projection matches.
  await page.keyboard.press("KeyV")

  // The EVIDENCE line is emitted on win. Wait for it (with margin).
  await expect.poll(() => evidenceLines.length, { timeout: 8000 }).toBeGreaterThanOrEqual(1)

  const raw = evidenceLines.at(-1)
  expect(raw, "EVIDENCE line captured").toBeDefined()
  const record = JSON.parse(raw ?? "{}")
  expect(record.schema).toBe("08_event_driven_order_system-v1")
  expect(record.source).toBe("pixeldojo")
  expect(record.unit_id).toBe("08_event_driven_order_system")
  expect(record.project).toBe("08_event_driven_order_system")
  expect(record.game).toBe("Timeline Tower")
  expect(record.scenario_id).toBe("timeline-tower-L1")
  expect(record.pass).toBe(true)
  expect(record.metrics.kind).toBe("timeline-tower")
  expect(record.metrics.level).toBe(1)
  expect(record.metrics.orders_completed).toBeGreaterThanOrEqual(3)
  expect(record.metrics.invalid_transitions_accepted).toBe(0)
  expect(record.metrics.invalid_transitions_rejected).toBeGreaterThanOrEqual(1)
  expect(record.metrics.projection_desync_after_replay).toBe(false)

  // All gates reported by the emitter must be marked passed.
  for (const gate of record.gates) {
    expect(gate.passed, `gate ${gate.name} must pass`).toBe(true)
  }

  expect(record.curriculum_context).toMatchObject({
    concept: "event-sourced order lifecycle with async projections",
    mechanic: expect.stringContaining("Timeline Tower"),
  })
  expect(record.review_context).toMatchObject({
    scheduled_review: false,
    review_reason: "deepening",
    verifier_required: true,
  })

  // In-page window channel also carries the record.
  const channelRecord = await page.evaluate(() => window.__gameEvidence)
  expect(channelRecord?.unit_id).toBe("08_event_driven_order_system")
  expect(channelRecord?.pass).toBe(true)

  // Persist NDJSON for the verifier contract (one line per completed attempt).
  mkdirSync(dirname(evidenceLogPath), { recursive: true })
  writeFileSync(evidenceLogPath, `${JSON.stringify(record)}\n`, "utf8")

  // Side-effect contract: the game MUST NOT publish learner state, MUST NOT
  // write the canonical learning-state localStorage keys. The verifier owns
  // the mastery transition.
  const sideEffects = await page.evaluate(() => ({
    learningStatePublished: "__pixelQuestLearningState" in window,
    gameEvidencePublished: "__gameEvidence" in window,
    localStorageKeys: Object.keys(localStorage),
  }))
  expect(sideEffects.learningStatePublished).toBe(false)
  expect(sideEffects.gameEvidencePublished).toBe(true)
  expect(sideEffects.localStorageKeys).not.toContain("learning_state")
  expect(sideEffects.localStorageKeys).not.toContain("units_log")
  expect(sideEffects.localStorageKeys).not.toContain("mastered")

  await page.screenshot({
    path: "shots/08_event_driven_order_system.png",
    fullPage: true,
  })
  expect(runtimeErrors).toEqual([])
})

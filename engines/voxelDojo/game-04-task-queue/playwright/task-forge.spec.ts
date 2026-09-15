import { expect, test } from "@playwright/test"
import { collectEvidence, type EvidenceRecord } from "../../shared/testHelpers"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and a
 * cleared wave emits an EVIDENCE console record with the voxeldojo schema for
 * unit U4-task-queue. Concept math is proven in Vitest (src/sim/queue.test.ts,
 * src/game/controller.test.ts); this spec proves the wiring inside a real
 * browser, end-to-end (plan §11 verifier handoff).
 */

test("boots the forge, plays L1 via HUD buttons + truth API, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // Play L1 through the public truth API (deterministic), driving the HUD
  // buttons for dispatch predictions and R/P when required.
  for (let i = 0; i < 60; i++) {
    const phase = await page.evaluate(() => window.__taskForge?.game.snapshot.phase)
    if (phase !== "playing") break
    const mustReject = await page.evaluate(() => {
      const g = window.__taskForge?.game
      return g ? g.snapshot.inbound !== null && g.inboundRequiresReject() : false
    })
    if (mustReject) {
      await page.getByTestId("reject-inbound").click()
      continue
    }
    const headIsWaiting = await page.evaluate(() => {
      const g = window.__taskForge?.game
      return g ? g.headFinished() !== null : false
    })
    if (headIsWaiting) {
      const route = await page.evaluate(() => window.__taskForge?.game.headFinished()?.correctRoute)
      await page.getByTestId(route === "retry" ? "classify-retry" : "classify-dlq").click()
      continue
    }
    const expected = await page.evaluate(() => window.__taskForge?.game.expectedDispatchId())
    if (expected) {
      await page.getByTestId(`pick-${expected}`).click()
      continue
    }
    await page.keyboard.press("p")
    await page.keyboard.press("p")
  }

  await expect(page.getByTestId("hud-status")).toContainText("concluída")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U4-task-queue")
  expect(first.project).toBe("04_concurrent_task_queue")
  expect(first.scenario_id).toBe("task-forge-L1")
  expect(first.game).toBe("TASK FORGE")
  expect(first.pass).toBe(true)
  expect(first.metrics.kind).toBe("voxeldojo-task-queue")
  expect(first.metrics.dispatch_correct).toBe(first.metrics.dispatch_predictions)
  // AID-1906: the record carries the closed observations trace the verifier replays
  const observations = first.observations as { kind: string; decisions: unknown[] }
  expect(observations.kind).toBe("task-forge-L1")
  const decisions = observations.decisions as Array<Record<string, unknown>>
  const dispatches = decisions.filter((d) => d.type === "dispatch")
  const classifies = decisions.filter((d) => d.type === "classify")
  expect(dispatches).toHaveLength(first.metrics.dispatch_predictions)
  expect(classifies).toHaveLength(
    first.metrics.retry_classifications + first.metrics.dlq_classifications,
  )
  expect(decisions[0]).toEqual({ type: "dispatch", taskId: expect.any(String) })
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L4 gauntlet: poison and exhausted ingots go to the chute, evidence passes", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__taskForge?.game.loadLevel("L4"))
  await page.getByTestId("start").click()

  for (let i = 0; i < 120; i++) {
    const phase = await page.evaluate(() => window.__taskForge?.game.snapshot.phase)
    if (phase !== "playing") break
    const mustReject = await page.evaluate(() => {
      const g = window.__taskForge?.game
      return g ? g.snapshot.inbound !== null && g.inboundRequiresReject() : false
    })
    if (mustReject) {
      await page.getByTestId("reject-inbound").click()
      continue
    }
    const route = await page.evaluate(() => window.__taskForge?.game.headFinished()?.correctRoute)
    if (route) {
      await page.getByTestId(route === "retry" ? "classify-retry" : "classify-dlq").click()
      continue
    }
    const expected = await page.evaluate(() => window.__taskForge?.game.expectedDispatchId())
    if (expected) {
      await page.getByTestId(`pick-${expected}`).click()
      continue
    }
    await page.keyboard.press("p")
    await page.keyboard.press("p")
  }

  await expect(page.getByTestId("hud-status")).toContainText("concluída")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "task-forge-L4")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.metrics.poison_requeued).toBe(0)
  expect(record?.metrics.idempotency_duplicates_enqueued).toBe(0)
  expect(record?.metrics.dlq_correct).toBe(record?.metrics.dlq_classifications)
  expect(record?.metrics.max_concurrent_running).toBeLessThanOrEqual(
    record?.metrics.worker_count ?? 0,
  )

  await page.screenshot({ path: ".logs/smoke-L4-cleared.png" })
})

test("renders an actual WebGL canvas (not a blank shell)", async ({ page }) => {
  await page.goto("/")
  const hasContext = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#stage")
    if (!canvas) return false
    return canvas.getContext("webgl2") !== null || canvas.getContext("webgl") !== null
  })
  expect(hasContext).toBe(true)
})

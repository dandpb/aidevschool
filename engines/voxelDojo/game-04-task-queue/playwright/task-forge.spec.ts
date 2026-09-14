import { expect, test } from "@playwright/test"
import { collectEvidence, type EvidenceRecord } from "../../shared/testHelpers"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the forge, and a cleared
 * L1 wave emits an EVIDENCE console record with the frozen voxeldojo-task-queue schema
 * (plan engines/pixelDojo/docs/plans/04_concurrent_task_queue.md §11). Concept math is
 * proven in Vitest (src/sim/queue.test.ts); this spec proves the wiring in a real browser.
 */
test("boots the forge, plays L1 by predicting dispatches, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // Play L1 through the public API truth (deterministic), clicking the real HUD buttons.
  for (let i = 0; i < 12; i++) {
    const truthId = await page.evaluate(() => window.__taskForge?.game.truthPickId() ?? null)
    if (truthId === null) break
    await expect(page.getByTestId(`ingot-${truthId}`)).toBeVisible()
    await page.getByTestId(`ingot-${truthId}`).click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U4-task-queue")
  expect(first.project).toBe("04_concurrent_task_queue")
  expect(first.game).toBe("TASK FORGE")
  expect(first.scenario_id).toBe("task-forge-L1")
  expect(first.pass).toBe(true)
  expect(first.metrics.kind).toBe("voxeldojo-task-queue")
  expect(first.metrics.dispatch_predictions).toBe(12)
  expect(first.metrics.dispatch_correct).toBe(12)
  expect(first.metrics.worker_count).toBe(3)
  expect(first.metrics.max_concurrent_running).toBeLessThanOrEqual(3)
  // AID-1906: the record carries the observations trace the verifier replays
  const observations = first.observations as { kind: string; decisions: unknown[] }
  expect(observations.kind).toBe("task-forge-L1")
  expect(observations.decisions).toHaveLength(12)
  expect(observations.decisions[0]).toEqual({ type: "dispatch", taskId: "t-0-order-101" })
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L3 teaches retry vs DLQ: classifications are recorded in the evidence metrics", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__taskForge?.game.loadLevel("L3"))
  await page.getByTestId("start").click()

  for (let i = 0; i < 200; i++) {
    const pendingKind = await page.evaluate(() => {
      const hook = window.__taskForge
      if (!hook) return "done" as const
      const p = hook.game.snapshot.pending
      if (!p)
        return hook.game.snapshot.phase === "running" ? ("stalled" as const) : ("done" as const)
      return p.kind
    })
    if (pendingKind === "done") break
    if (pendingKind === "dispatch") {
      const truthId = await page.evaluate(() => window.__taskForge?.game.truthPickId() ?? null)
      if (truthId === null) break
      await page.getByTestId(`ingot-${truthId}`).click()
    } else if (pendingKind === "classify") {
      const route = await page.evaluate(() => window.__taskForge?.game.truthRoute() ?? null)
      const held = await page.evaluate(() => {
        const p = window.__taskForge?.game.snapshot.pending
        return p?.kind === "classify" ? p.task.id : null
      })
      if (held === null || route === null) break
      await page.getByTestId(route === "retry" ? "classify-retry" : "classify-dlq").click()
    } else {
      await page.getByTestId("reject").click()
    }
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "task-forge-L3")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.metrics.retry_classifications as number).toBeGreaterThan(0)
  expect(record?.metrics.retry_correct).toBe(record?.metrics.retry_classifications)
  expect(record?.metrics.dlq_classifications as number).toBeGreaterThan(0)
  expect(record?.metrics.dlq_correct).toBe(record?.metrics.dlq_classifications)
  expect(record?.metrics.poison_requeued).toBe(0)

  await page.screenshot({ path: ".logs/smoke-L3-cleared.png" })
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

import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract for the 04_concurrent_task_queue game (TASK FORGE).
 * Drives the L1 wave through the public HUD buttons (the same ones a learner
 * would click), keyed off the controller's deterministic `correctAction()`
 * ground truth. A cleared wave emits one EVIDENCE console record + a
 * window.__gameEvidence record; this spec greps for both and screenshots.
 */
interface PublicAction {
  phase: "briefing" | "predicting" | "classifying" | "boundary" | "cleared" | "failed"
  ingotId?: string
  route?: "retry" | "dlq"
  action?: "accept" | "reject"
  reason?: string
}

interface EvidenceRecord {
  schema: string
  unit_id: string
  project: string
  scenario_id: string
  pass: boolean
  gates: string[]
}

function parseEvidence(lines: string[]): EvidenceRecord[] {
  return lines
    .filter((l) => l.startsWith("EVIDENCE "))
    .map((l) => JSON.parse(l.slice("EVIDENCE ".length)) as EvidenceRecord)
}

test("plays the L1 wave, clears it, and emits a passing EVIDENCE record", async ({ page }) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  const runtimeErrors: string[] = []
  page.on("pageerror", (err) => runtimeErrors.push(err.message))

  await page.goto("/")

  // The HUD title and the WebGL canvas are present on boot.
  await expect(page.getByTestId("hud-title")).toContainText("TASK FORGE")
  await expect(page.locator("canvas")).toBeVisible()

  // Start the wave.
  await page.getByTestId("start").click()

  // Drive each step using the controller's deterministic correctAction().
  // The wave is turn-based, so we step until the phase is cleared/failed.
  // Safety cap so a logic bug fails the test rather than hanging it.
  for (let step = 0; step < 200; step++) {
    const action = await page.evaluate(() => {
      const hook = window.__taskForge
      if (!hook) throw new Error("no test hook")
      return hook.game.correctAction() as PublicAction
    })
    if (action.phase === "cleared" || action.phase === "failed") break

    if (action.phase === "boundary") {
      if (action.action === "accept") await page.getByTestId("accept").click()
      else await page.getByTestId("reject").click()
      continue
    }
    if (action.phase === "predicting") {
      const ingotId = action.ingotId
      if (!ingotId) throw new Error("predicting phase without ingotId")
      await page.getByTestId(`ingot-${ingotId}`).click()
      continue
    }
    if (action.phase === "classifying") {
      if (action.route === "retry") await page.getByTestId("route-retry").click()
      else await page.getByTestId("route-dlq").click()
      continue
    }
    throw new Error(`unexpected phase mid-wave: ${action.phase}`)
  }

  // Wave clear assertions.
  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  await expect(page.getByTestId("queue-summary")).toContainText("running 0/3")

  // Exactly one EVIDENCE record, captured both via console and the page channel.
  const records = parseEvidence(consoleLines)
  expect(records.length).toBeGreaterThanOrEqual(1)
  const last = records[records.length - 1] as EvidenceRecord
  expect(last.schema).toBe("04_concurrent_task_queue-v1")
  expect(last.unit_id).toBe("04_concurrent_task_queue")
  expect(last.project).toBe("04_concurrent_task_queue")
  expect(last.scenario_id).toBe("task-forge-L1")
  expect(last.pass).toBe(true)
  expect(last.gates).toContain("priority-fifo-dispatch")
  expect(last.gates).toContain("retry-backoff")
  expect(last.gates).toContain("poison-dlq")
  expect(last.gates).toContain("backpressure")
  expect(last.gates).toContain("idempotency")
  expect(last.gates).toContain("concurrency-invariant")

  const pageRecord = await page.evaluate(() => window.__gameEvidence ?? null)
  expect(pageRecord?.schema).toBe("04_concurrent_task_queue-v1")
  expect(pageRecord?.pass).toBe(true)

  // A real WebGL canvas is rendering — not a blank shell.
  const hasContext = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#stage")
    if (!canvas) return false
    return canvas.getContext("webgl2") !== null || canvas.getContext("webgl") !== null
  })
  expect(hasContext).toBe(true)

  await page.screenshot({ path: "shots/04_concurrent_task_queue.png", fullPage: true })
  expect(runtimeErrors).toEqual([])

  // Persist the emitted EVIDENCE record so it can be copied to the
  // .loops/threejs-dojo output dir as the wave's durable artifact.
  const evidenceLogPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    ".logs",
    "evidence.json",
  )
  mkdirSync(dirname(evidenceLogPath), { recursive: true })
  writeFileSync(evidenceLogPath, `${JSON.stringify(last, null, 2)}\n`, "utf8")
})

import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * waves emit EVIDENCE console records with the voxeldojo schema. Concept math is proven in
 * Vitest (src/sim/queue.test.ts); this spec proves the wiring inside a real browser.
 */

interface EvidenceRecord {
  source: string
  unit_id: string
  project: string
  scenario_id: string
  game: string
  pass: boolean
  metrics: Record<string, number | boolean>
}

function collectEvidence(lines: string[]): EvidenceRecord[] {
  return lines
    .filter((l) => l.startsWith("EVIDENCE "))
    .map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
}

test("boots the yard, plays L1 by clicking predicted lanes, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // Play L1 through the public API truth (deterministic), clicking the real HUD lane buttons.
  for (let i = 0; i < 20; i++) {
    const lane = await page.evaluate(() => {
      const hook = window.__freightYard
      if (!hook) throw new Error("no test hook")
      const s = hook.game.snapshot
      if (s.phase !== "predicting" || !s.pendingKey) return null
      return hook.game.pendingKeyPartition()
    })
    if (lane === null) break
    await page.getByTestId(`lane-${lane}`).click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U16-message-queue")
  expect(first.project).toBe("16_mini_message_queue")
  expect(first.game).toBe("FREIGHT YARD")
  expect(first.scenario_id).toBe("freight-yard-L1")
  expect(first.pass).toBe(true)
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L2 crews: auto-assigning lanes then locking in clears and emits a complete-assignment record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__freightYard?.game.loadLevel("L2"))
  await expect(page.getByTestId("hud-title")).toContainText("L2")
  await page.getByTestId("start").click()
  // Auto-assign produces the canonical complete round-robin layout → pass.
  await page.getByTestId("auto-assign").click()
  await page.getByTestId("lock-in").click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "freight-yard-L2")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.metrics.lanes_orphaned).toBe(0)
  expect(record?.metrics.assignment_valid).toBe(true)

  await page.screenshot({ path: ".logs/smoke-L2-cleared.png" })
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

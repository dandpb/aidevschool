import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * waves emit EVIDENCE console records with the voxeldojo schema. Concept math is proven in
 * Vitest (src/sim/sourcing.test.ts); this spec proves the wiring inside a real browser.
 */

interface EvidenceRecord {
  source: string
  unit_id: string
  project: string
  scenario_id: string
  pass: boolean
  metrics: Record<string, number | boolean>
}

function collectEvidence(lines: string[]): EvidenceRecord[] {
  return lines
    .filter((l) => l.startsWith("EVIDENCE "))
    .map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
}

test("boots the tower, plays L1 by appending the correct event order, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // Play L1 through the public API truth (deterministic), clicking the real HUD buttons.
  for (let i = 0; i < 6; i++) {
    const correctType = await page.evaluate(() => {
      const hook = window.__timelineTower
      if (!hook) throw new Error("no test hook")
      return hook.game.nextCorrectEventType()
    })
    if (correctType === null) break
    await page.getByTestId(`append-${correctType}`).click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U8-event-driven")
  expect(first.project).toBe("08_event_driven_order_system")
  expect(first.scenario_id).toBe("timeline-tower-L1")
  expect(first.pass).toBe(true)
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L2 build-the-projection: predicting the true final status clears and emits evidence", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__timelineTower?.game.loadLevel("L2"))
  await page.getByTestId("start").click()
  const truth = await page.evaluate(() => window.__timelineTower?.game.truthStatus() ?? null)
  expect(truth).not.toBeNull()
  await page.getByTestId(`status-${truth}`).click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "timeline-tower-L2")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)

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

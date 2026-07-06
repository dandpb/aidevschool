import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * waves emit EVIDENCE console records with the voxeldojo schema. Concept math is proven in
 * Vitest (src/sim/index.test.ts); this spec proves the wiring inside a real browser.
 */

interface EvidenceRecord {
  source: string
  unit_id: string
  project: string
  scenario_id: string
  pass: boolean
  metrics: Record<string, number | boolean | string>
}

function collectEvidence(lines: string[]): EvidenceRecord[] {
  return lines
    .filter((l) => l.startsWith("EVIDENCE "))
    .map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
}

test("renders an actual WebGL canvas (not a blank shell)", async ({ page }) => {
  await page.goto("/")
  const hasContext = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#stage")
    if (!canvas) return false
    return canvas.getContext("webgl2") !== null || canvas.getContext("webgl") !== null
  })
  expect(hasContext).toBe(true)
})

test("boots the library, plays L1 by filing word-cards onto the right shelves, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // File each word-card onto its truth shelf via the deterministic public API truth.
  for (let i = 0; i < 4; i++) {
    const term = await page.evaluate(() => {
      const hook = window.__stacks
      if (!hook) throw new Error("no test hook")
      const prog = hook.game.snapshot
      const card = prog.cards[prog.filingPredictions.length]
      if (card === undefined) return null
      return hook.game.cardTruth(card)
    })
    if (term === null) break
    await page.getByTestId(`shelf-${term}`).click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U18-search-engine")
  expect(first.project).toBe("18_search_engine")
  expect(first.scenario_id).toBe("stacks-L1")
  expect(first.pass).toBe(true)
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L2 one-term query: predicting the top doc clears and emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__stacks?.game.loadLevel("L2"))
  await page.getByTestId("start").click()

  // Predict the top doc via the deterministic public API truth.
  const topDoc = await page.evaluate(() => window.__stacks?.game.topDocId() ?? null)
  expect(topDoc).toBeTruthy()
  await page.getByTestId(`doc-${topDoc}`).click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "stacks-L2")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.metrics.top_prediction_ok).toBe(true)

  await page.screenshot({ path: ".logs/smoke-L2-cleared.png" })
})

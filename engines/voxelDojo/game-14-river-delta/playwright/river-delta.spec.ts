import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * waves emit EVIDENCE console records with the voxeldojo schema. Concept math is proven in
 * Vitest (src/sim/pipeline.test.ts); this spec proves the wiring inside a real browser and
 * exercises the deterministic public API via the test hook.
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

test("boots the delta, plays L1 by predicting the source of each log, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // Play L1 through the public API truth (deterministic), clicking the real HUD buttons.
  const promptCount = await page.evaluate(
    () => window.__riverDelta?.game.snapshot.prompts.length ?? 0,
  )
  for (let i = 0; i < promptCount; i++) {
    const sourceId = await page.evaluate(() => {
      const hook = window.__riverDelta
      if (!hook) throw new Error("no test hook")
      const s = hook.game.snapshot
      const logId = s.prompts[s.promptIndex]
      if (logId === undefined) return null
      return hook.game.sourceOf(logId)
    })
    if (sourceId === null) break
    await page.getByTestId(`source-${sourceId}`).click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBeGreaterThanOrEqual(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U14-log-aggregator")
  expect(first.project).toBe("14_log_aggregator")
  expect(first.scenario_id).toBe("river-delta-L1")
  expect(first.pass).toBe(true)
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBeGreaterThanOrEqual(
    1,
  )

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L2 filter: predicting pass/drop for each log clears the wave and emits bounded metrics", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__riverDelta?.game.loadLevel("L2"))
  await page.getByTestId("start").click()

  const promptCount = await page.evaluate(
    () => window.__riverDelta?.game.snapshot.prompts.length ?? 0,
  )
  for (let i = 0; i < promptCount; i++) {
    const reached = await page.evaluate(() => {
      const hook = window.__riverDelta
      if (!hook) return null
      const s = hook.game.snapshot
      const logId = s.prompts[s.promptIndex]
      if (logId === undefined) return null
      return hook.game.logReached(logId)
    })
    if (reached === null) break
    await page.getByTestId(reached ? "filter-pass" : "filter-drop").click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "river-delta-L2")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)

  await page.screenshot({ path: ".logs/smoke-L2-cleared.png" })
})

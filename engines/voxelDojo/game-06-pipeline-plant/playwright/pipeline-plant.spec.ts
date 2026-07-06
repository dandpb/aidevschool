import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * waves emit EVIDENCE console records with the voxeldojo schema. Concept math is proven in
 * Vitest (src/sim/pipeline.test.ts); this spec proves the wiring inside a real browser.
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

test("boots the tank, plays L1 by predicting overflow from the public API truth, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // Read the deterministic ground truth from the public API and click the matching button.
  const willOverflow = await page.evaluate(() => {
    const hook = window.__pipelinePlant
    if (!hook) throw new Error("no test hook")
    return hook.game.bufferedOverflows()
  })

  if (willOverflow) await page.getByTestId("predict-overflow-yes").click()
  else await page.getByTestId("predict-overflow-no").click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U6-file-upload")
  expect(first.project).toBe("06_file_upload_pipeline")
  expect(first.scenario_id).toBe("pipeline-plant-L1")
  expect(first.pass).toBe(true)
  expect(first.metrics.mode).toBe("buffered")
  expect(first.metrics.overflow_predicted).toBe(willOverflow)
  expect(first.metrics.overflow_actual).toBe(willOverflow)
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L2 stream: predicting bounded stays flat and clears with no overflow", async ({ page }) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__pipelinePlant?.game.loadLevel("L2"))
  await page.getByTestId("start").click()
  await page.getByTestId("predict-bounded-yes").click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "pipeline-plant-L2")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.metrics.mode).toBe("streaming")
  expect(record?.metrics.overflowed).toBe(0)
  // peak memory = chunk size, flat regardless of the huge total size
  const peak = record?.metrics.peak_mem as number
  const chunk = record?.metrics.chunk_size as number
  expect(peak).toBe(chunk)

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

import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * waves emit EVIDENCE console records with the voxeldojo schema. Concept math is proven in
 * Vitest (src/sim/histogram.test.ts); this spec proves the wiring inside a real browser and
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

test("boots the observatory, plays L1 by clicking predicted buckets, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // Play L1 through the public API truth (deterministic), clicking the real HUD bucket buttons.
  const count = await page.evaluate(() => {
    const hook = window.__observatory
    if (!hook) throw new Error("no test hook")
    return hook.game.snapshot.level.sampleCount
  })
  for (let i = 0; i < count; i++) {
    const bucket = await page.evaluate(() => {
      const hook = window.__observatory
      if (!hook) throw new Error("no test hook")
      return hook.game.truthBucket()
    })
    await page.getByTestId(`bucket-${bucket}`).click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U15-metrics-collector")
  expect(first.project).toBe("15_metrics_collector")
  expect(first.scenario_id).toBe("observatory-L1")
  expect(first.pass).toBe(true)
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L2: predicting the bucket the p95 contour sits in clears and emits the percentile value", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__observatory?.game.loadLevel("L2"))
  await page.getByTestId("start").click()
  // The p95 lands in a deterministic bucket — read the truth off the public API.
  const pValue = await page.evaluate(() => window.__observatory?.game.watchedPercentile() ?? NaN)
  expect(pValue).not.toBeNaN()
  const bucket = await page.evaluate(() => {
    const hook = window.__observatory
    if (!hook) throw new Error("no test hook")
    const h = hook.game.snapshot.histogram
    const p = hook.game.watchedPercentile()
    let idx = 0
    for (let i = 0; i < h.boundaries.length; i++) {
      if (p <= h.boundaries[i]) {
        idx = i
        break
      }
      idx = h.boundaries.length - 1
    }
    return idx
  })
  await page.getByTestId(`bucket-${bucket}`).click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "observatory-L2")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.metrics.percentile_bucket_prediction_ok).toBe(true)

  await page.screenshot({ path: ".logs/smoke-L2-cleared.png" })
})

test("L4: the fat-tail distribution alerts under the SLO while the tight one stays silent", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__observatory?.game.loadLevel("L4"))
  await page.getByTestId("start").click()
  // The alerting distribution is whichever has p95 > SLO — read the truth off the public API.
  const alerting = await page.evaluate(
    () => window.__observatory?.game.alertingDistributionId() ?? null,
  )
  expect(alerting).not.toBeNull()
  await page.getByTestId(`dist-${alerting}`).click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "observatory-L4")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.metrics.distribution_choice_ok).toBe(true)

  await page.screenshot({ path: ".logs/smoke-L4-cleared.png" })
})

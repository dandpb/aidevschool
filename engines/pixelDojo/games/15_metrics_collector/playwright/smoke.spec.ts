import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"
import { type BucketLe } from "../src/game/evidence"

/**
 * Browser smoke contract for the Metrics Observatory. Boots WebGL, drives the
 * wave deterministically via the public test hook, and asserts a passing
 * EVIDENCE console line with the project's schema. Concept math is proven in
 * Vitest (src/game/observatory.test.ts); this spec proves the wiring inside
 * a real browser, end-to-end through the alert lifecycle.
 */
interface MetricsEvidence {
  schema: string
  source: string
  unit_id: string
  project: string
  scenario_id: string
  pass: boolean
  gates: string[]
  metrics: {
    kind: string
    bucket_plan: BucketLe[]
    obs_total: number
    obs_bucketed_correct: number
    obs_misbucketed: number
    percentile_queries_total: number
    percentile_queries_correct: number
    percentile_queries_wrong: number
    sum_observed: number
    sum_recorded: number
    alert_threshold_requested_le: BucketLe
    alert_threshold_set_le: BucketLe
    alert_threshold_correct: boolean
    alert_lifecycle_observed: string[]
    alert_lifecycle_correct: boolean
    window_seconds: number
    overflow_drops: number
  }
}

const evidenceLogPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".logs",
  "evidence.ndjson",
)

function parseEvidence(lines: string[]): MetricsEvidence[] {
  return lines
    .filter((l) => l.startsWith("EVIDENCE "))
    .map((l) => JSON.parse(l.slice("EVIDENCE ".length)) as MetricsEvidence)
}

test("metrics observatory wave 1 — full lifecycle emits a passing evidence record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  const runtimeErrors: string[] = []
  page.on("console", (m) => consoleLines.push(m.text()))
  page.on("pageerror", (err) => runtimeErrors.push(err.message))

  await page.goto("/")
  await expect(page.getByText("Metrics Observatory")).toBeVisible()
  const isWebGL = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#stage")
    if (!canvas) return false
    return canvas.getContext("webgl2") !== null || canvas.getContext("webgl") !== null
  })
  expect(isWebGL).toBe(true)

  // Press START (the button enables interaction; the API hook is live regardless).
  await page.getByTestId("start").click()

  // 1. Set the alert threshold (plane) to the wave-card threshold idx 4 (le=100).
  await page.evaluate(() => window.__metricsObservatory?.setAlertThreshold(4))

  // 2. Route each of the 12 obs into its smallest-`le`-≥-value bucket.
  //    The deterministic rule is the same one the player must internalize.
  await page.evaluate(() => {
    const g = window.__metricsObservatory
    if (!g) throw new Error("no test hook")
    const bounds = [5, 10, 25, 50, 100, 250, 500, Infinity]
    const values = [3, 8, 15, 35, 75, 95, 120, 180, 240, 380, 450, 600]
    for (const v of values) {
      const expected = bounds.findIndex((b) => v <= b)
      if (expected < 0) throw new Error(`no bucket for ${v}`)
      g.routeNext(expected)
    }
  })

  // Sanity: histogram filled correctly before the lifecycle runs.
  const total = await page.evaluate(() => window.__metricsObservatory?.snapshot.total)
  expect(total).toBe(12)

  // 3. Answer each queued percentile query from the cumulative ribbon.
  await page.evaluate(() => {
    const g = window.__metricsObservatory
    if (!g) throw new Error("no test hook")
    while (g.snapshot.pendingPercentileQueries.length > 0) {
      const p = g.snapshot.pendingPercentileQueries[0]
      if (p === undefined) break
      const expected = g.observatoryInstance.queryPercentile(p)
      g.answerPercentile(expected)
    }
  })
  const answered = await page.evaluate(
    () => window.__metricsObservatory?.snapshot.percentileQueriesCorrect,
  )
  expect(answered).toBe(3)

  // 4. Drive the alert lifecycle: tick into pending, hold into firing, age the
  //    window past 30s so the active set empties and p95 drops — resolved.
  await page.evaluate(() => {
    const g = window.__metricsObservatory
    if (!g) throw new Error("no test hook")
    g.tick(1) // pending
    g.tick(4) // firing (hold satisfied)
    g.tick(31) // obs age out -> not breaching -> resolved
  })

  const lifecycle = await page.evaluate(() => window.__metricsObservatory?.snapshot.alertLifecycle)
  expect(lifecycle).toEqual(["pending", "firing", "resolved"])
  const alertState = await page.evaluate(() => window.__metricsObservatory?.snapshot.alertState)
  expect(alertState).toBe("resolved")

  // 5. Ack the resolved alert (the runbook step). tryEmit fires the record.
  await page.evaluate(() => {
    const g = window.__metricsObservatory
    if (!g) throw new Error("no test hook")
    g.ackAlert()
    g.tryEmit()
  })

  const records = parseEvidence(consoleLines)
  expect(records).toHaveLength(1)
  const rec = records[0]
  if (!rec) throw new Error("no evidence record")
  expect(rec.schema).toBe("15_metrics_collector-v1")
  expect(rec.source).toBe("voxeldojo")
  expect(rec.unit_id).toBe("U15-metrics-collector")
  expect(rec.project).toBe("15_metrics_collector")
  expect(rec.scenario_id).toBe("metrics-collector-L1")
  expect(rec.pass).toBe(true)
  expect(rec.metrics.kind).toBe("voxeldojo-metrics-observatory")
  expect(rec.metrics.bucket_plan).toEqual([5, 10, 25, 50, 100, 250, 500, Infinity])
  expect(rec.metrics.obs_total).toBe(12)
  expect(rec.metrics.obs_bucketed_correct).toBe(12)
  expect(rec.metrics.obs_misbucketed).toBe(0)
  expect(rec.metrics.percentile_queries_total).toBe(3)
  expect(rec.metrics.percentile_queries_correct).toBe(3)
  expect(rec.metrics.percentile_queries_wrong).toBe(0)
  expect(rec.metrics.sum_observed).toBe(2201)
  expect(rec.metrics.sum_recorded).toBe(2201)
  expect(rec.metrics.alert_threshold_requested_le).toBe(100)
  expect(rec.metrics.alert_threshold_set_le).toBe(100)
  expect(rec.metrics.alert_threshold_correct).toBe(true)
  expect(rec.metrics.alert_lifecycle_observed).toEqual(["pending", "firing", "resolved"])
  expect(rec.metrics.alert_lifecycle_correct).toBe(true)
  expect(rec.metrics.window_seconds).toBe(30)
  expect(rec.metrics.overflow_drops).toBe(0)

  // Producer-only contract: the game never writes learner state.
  const sideEffects = await page.evaluate(() => ({
    published: "__pixelQuestLearningState" in window || "__voxelDojoLearningState" in window,
    ls: Object.keys(localStorage),
  }))
  expect(sideEffects.published).toBe(false)
  expect(sideEffects.ls).not.toContain("learning_state")
  expect(sideEffects.ls).not.toContain("units_log")
  expect(sideEffects.ls).not.toContain("mastered")

  // Persist the record as NDJSON for the verifier.
  mkdirSync(dirname(evidenceLogPath), { recursive: true })
  writeFileSync(evidenceLogPath, `${JSON.stringify(rec)}\n`, "utf8")

  // The in-page channel should match the console record.
  const inPage = await page.evaluate(() => window.__metricsObservatoryEvidence?.at(-1))
  expect(inPage).toMatchObject({ pass: true, unit_id: "U15-metrics-collector" })

  await page.screenshot({ path: "shots/15_metrics_collector.png", fullPage: true })

  // No runtime errors during the playthrough.
  expect(runtimeErrors).toEqual([])
})

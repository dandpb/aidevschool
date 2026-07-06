# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> metrics observatory wave 1 — full lifecycle emits a passing evidence record
- Location: playwright/smoke.spec.ts:55:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('Metrics Observatory')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Metrics Observatory')
    11 × locator resolved to <h1>Metrics Observatory</h1>
       - unexpected value "hidden"

```

```yaml
- complementary:
  - heading "Metrics Observatory" [level=1]
  - paragraph: "Route each latency orb to the smallest `le >= value` bucket, read p50/p95/p99 from the cumulative ribbon, and watch the alert go pending -> firing -> resolved."
  - button "Start wave"
  - text: Press START to begin the wave.
  - button "V Ack resolved alert" [disabled]
  - button "Tick +5s (window advance)"
  - heading "Bucket plan" [level=2]
  - text: "le count / cumulative idx le=5 0 / 0 idx 0 le=10 0 / 0 idx 1 le=25 0 / 0 idx 2 le=50 0 / 0 idx 3 le=100 0 / 0 idx 4 le=250 0 / 0 idx 5 le=500 0 / 0 idx 6 +Inf 0 / 0 idx 7 p50 rank=0 -> bucket idx -1 (aim cursor: idx 0) Alert: inactive (no threshold set) · hold 4s · window 30s Orb in claw: 3ms (drop into le=5) obs: 0/0 ok (0 wrong), percentile: 0/0, sum: 0/0, overflow: 0, acked: false <kbd>A</kbd>/<kbd>D</kbd> or <kbd>←</kbd>/<kbd>→</kbd> slide claw<br/><kbd>↑</kbd>/<kbd>↓</kbd> raise / lower alert plane<br/><kbd>Z</kbd> drop orb into the column under the claw<br/><kbd>X</kbd> read ribbon / commit percentile answer<br/><kbd>V</kbd> ack resolved alert<br/><kbd>Space</kbd> advance the clock 1s (window slides)"
```

# Test source

```ts
  1   | import { mkdirSync, writeFileSync } from "node:fs"
  2   | import { dirname, join } from "node:path"
  3   | import { fileURLToPath } from "node:url"
  4   | import { expect, test } from "@playwright/test"
  5   | 
  6   | /**
  7   |  * Browser smoke contract for the Metrics Observatory. Boots WebGL, drives the
  8   |  * wave deterministically via the public test hook, and asserts a passing
  9   |  * EVIDENCE console line with the project's schema. Concept math is proven in
  10  |  * Vitest (src/game/observatory.test.ts); this spec proves the wiring inside
  11  |  * a real browser, end-to-end through the alert lifecycle.
  12  |  */
  13  | interface MetricsEvidence {
  14  |   schema: string
  15  |   source: string
  16  |   unit_id: string
  17  |   project: string
  18  |   scenario_id: string
  19  |   pass: boolean
  20  |   gates: string[]
  21  |   metrics: {
  22  |     kind: string
  23  |     bucket_plan: number[]
  24  |     obs_total: number
  25  |     obs_bucketed_correct: number
  26  |     obs_misbucketed: number
  27  |     percentile_queries_total: number
  28  |     percentile_queries_correct: number
  29  |     percentile_queries_wrong: number
  30  |     sum_observed: number
  31  |     sum_recorded: number
  32  |     alert_threshold_requested_le: number
  33  |     alert_threshold_set_le: number
  34  |     alert_threshold_correct: boolean
  35  |     alert_lifecycle_observed: string[]
  36  |     alert_lifecycle_correct: boolean
  37  |     window_seconds: number
  38  |     overflow_drops: number
  39  |   }
  40  | }
  41  | 
  42  | const evidenceLogPath = join(
  43  |   dirname(fileURLToPath(import.meta.url)),
  44  |   "..",
  45  |   ".logs",
  46  |   "evidence.ndjson",
  47  | )
  48  | 
  49  | function parseEvidence(lines: string[]): MetricsEvidence[] {
  50  |   return lines
  51  |     .filter((l) => l.startsWith("EVIDENCE "))
  52  |     .map((l) => JSON.parse(l.slice("EVIDENCE ".length)) as MetricsEvidence)
  53  | }
  54  | 
  55  | test("metrics observatory wave 1 — full lifecycle emits a passing evidence record", async ({
  56  |   page,
  57  | }) => {
  58  |   const consoleLines: string[] = []
  59  |   const runtimeErrors: string[] = []
  60  |   page.on("console", (m) => consoleLines.push(m.text()))
  61  |   page.on("pageerror", (err) => runtimeErrors.push(err.message))
  62  | 
  63  |   await page.goto("/")
> 64  |   await expect(page.getByText("Metrics Observatory")).toBeVisible()
      |                                                       ^ Error: expect(locator).toBeVisible() failed
  65  |   const isWebGL = await page.evaluate(() => {
  66  |     const canvas = document.querySelector<HTMLCanvasElement>("#stage")
  67  |     if (!canvas) return false
  68  |     return canvas.getContext("webgl2") !== null || canvas.getContext("webgl") !== null
  69  |   })
  70  |   expect(isWebGL).toBe(true)
  71  | 
  72  |   // Press START (the button enables interaction; the API hook is live regardless).
  73  |   await page.getByTestId("start").click()
  74  | 
  75  |   // 1. Set the alert threshold (plane) to the wave-card threshold idx 4 (le=100).
  76  |   await page.evaluate(() => window.__metricsObservatory?.setAlertThreshold(4))
  77  | 
  78  |   // 2. Route each of the 12 obs into its smallest-`le`-≥-value bucket.
  79  |   //    The deterministic rule is the same one the player must internalize.
  80  |   await page.evaluate(() => {
  81  |     const g = window.__metricsObservatory
  82  |     if (!g) throw new Error("no test hook")
  83  |     const bounds = [5, 10, 25, 50, 100, 250, 500, Infinity]
  84  |     const values = [3, 8, 15, 35, 75, 95, 120, 180, 240, 380, 450, 600]
  85  |     for (const v of values) {
  86  |       const expected = bounds.findIndex((b) => v <= b)
  87  |       if (expected < 0) throw new Error(`no bucket for ${v}`)
  88  |       g.routeNext(expected)
  89  |     }
  90  |   })
  91  | 
  92  |   // Sanity: histogram filled correctly before the lifecycle runs.
  93  |   const total = await page.evaluate(() => window.__metricsObservatory?.snapshot.total)
  94  |   expect(total).toBe(12)
  95  | 
  96  |   // 3. Answer each queued percentile query from the cumulative ribbon.
  97  |   await page.evaluate(() => {
  98  |     const g = window.__metricsObservatory
  99  |     if (!g) throw new Error("no test hook")
  100 |     while (g.snapshot.pendingPercentileQueries.length > 0) {
  101 |       const p = g.snapshot.pendingPercentileQueries[0]
  102 |       if (p === undefined) break
  103 |       const expected = g.observatoryInstance.queryPercentile(p)
  104 |       g.answerPercentile(expected)
  105 |     }
  106 |   })
  107 |   const answered = await page.evaluate(
  108 |     () => window.__metricsObservatory?.snapshot.percentileQueriesCorrect,
  109 |   )
  110 |   expect(answered).toBe(3)
  111 | 
  112 |   // 4. Drive the alert lifecycle: tick into pending, hold into firing, age the
  113 |   //    window past 30s so the active set empties and p95 drops — resolved.
  114 |   await page.evaluate(() => {
  115 |     const g = window.__metricsObservatory
  116 |     if (!g) throw new Error("no test hook")
  117 |     g.tick(1) // pending
  118 |     g.tick(4) // firing (hold satisfied)
  119 |     g.tick(31) // obs age out -> not breaching -> resolved
  120 |   })
  121 | 
  122 |   const lifecycle = await page.evaluate(() => window.__metricsObservatory?.snapshot.alertLifecycle)
  123 |   expect(lifecycle).toEqual(["pending", "firing", "resolved"])
  124 |   const alertState = await page.evaluate(() => window.__metricsObservatory?.snapshot.alertState)
  125 |   expect(alertState).toBe("resolved")
  126 | 
  127 |   // 5. Ack the resolved alert (the runbook step). tryEmit fires the record.
  128 |   await page.evaluate(() => {
  129 |     const g = window.__metricsObservatory
  130 |     if (!g) throw new Error("no test hook")
  131 |     g.ackAlert()
  132 |     g.tryEmit()
  133 |   })
  134 | 
  135 |   const records = parseEvidence(consoleLines)
  136 |   expect(records).toHaveLength(1)
  137 |   const rec = records[0]
  138 |   if (!rec) throw new Error("no evidence record")
  139 |   expect(rec.schema).toBe("15_metrics_collector-v1")
  140 |   expect(rec.source).toBe("voxeldojo")
  141 |   expect(rec.unit_id).toBe("U15-metrics-collector")
  142 |   expect(rec.project).toBe("15_metrics_collector")
  143 |   expect(rec.scenario_id).toBe("metrics-collector-L1")
  144 |   expect(rec.pass).toBe(true)
  145 |   expect(rec.metrics.kind).toBe("voxeldojo-metrics-observatory")
  146 |   expect(rec.metrics.bucket_plan).toEqual([5, 10, 25, 50, 100, 250, 500, Infinity])
  147 |   expect(rec.metrics.obs_total).toBe(12)
  148 |   expect(rec.metrics.obs_bucketed_correct).toBe(12)
  149 |   expect(rec.metrics.obs_misbucketed).toBe(0)
  150 |   expect(rec.metrics.percentile_queries_total).toBe(3)
  151 |   expect(rec.metrics.percentile_queries_correct).toBe(3)
  152 |   expect(rec.metrics.percentile_queries_wrong).toBe(0)
  153 |   expect(rec.metrics.sum_observed).toBe(2201)
  154 |   expect(rec.metrics.sum_recorded).toBe(2201)
  155 |   expect(rec.metrics.alert_threshold_requested_le).toBe(100)
  156 |   expect(rec.metrics.alert_threshold_set_le).toBe(100)
  157 |   expect(rec.metrics.alert_threshold_correct).toBe(true)
  158 |   expect(rec.metrics.alert_lifecycle_observed).toEqual(["pending", "firing", "resolved"])
  159 |   expect(rec.metrics.alert_lifecycle_correct).toBe(true)
  160 |   expect(rec.metrics.window_seconds).toBe(30)
  161 |   expect(rec.metrics.overflow_drops).toBe(0)
  162 | 
  163 |   // Producer-only contract: the game never writes learner state.
  164 |   const sideEffects = await page.evaluate(() => ({
```
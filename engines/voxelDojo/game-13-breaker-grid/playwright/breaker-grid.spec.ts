import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the breaker-grid
 * sim, and cleared/failed waves emit EVIDENCE console records with the voxeldojo
 * schema. Concept math is proven in Vitest (src/sim/breaker.test.ts); this spec
 * proves the wiring inside a real browser.
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

test("boots the grid, plays L1 by injecting failures + predicting the trip, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // Inject enough failures to trip the breaker (threshold = 3) into the selected district.
  // We read the deterministic truth from the test hook so the click sequence is correct.
  const selected = await page.evaluate(
    () => window.__breakerGrid?.game.snapshot.selectedDistrictId ?? null,
  )
  expect(selected).not.toBeNull()
  const threshold = await page.evaluate(
    () => window.__breakerGrid?.game.snapshot.level.failureThreshold ?? 0,
  )

  for (let i = 0; i < threshold; i++) {
    await page.getByTestId("inject-failure").click()
  }

  // The breaker should now be OPEN for the selected district.
  const stateBefore = await page.evaluate(() => {
    const g = window.__breakerGrid
    if (!g) return null
    const id = g.game.snapshot.selectedDistrictId
    const d = g.game.snapshot.districts.find((x) => x.id === id)
    return d?.breaker.state ?? null
  })
  expect(stateBefore).toBe("open")

  // Predict: state OPEN, tripped district = the selected one.
  await page.getByTestId("to-predict").click()
  await page.getByTestId("pred-state-open").click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U13-circuit-breaker")
  expect(first.project).toBe("13_api_gateway_circuit_breaker")
  expect(first.scenario_id).toBe("breaker-grid-L1")
  expect(first.pass).toBe(true)
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L2 cooldown + probe: predicting the half-open probe outcome clears the wave", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__breakerGrid?.game.loadLevel("L2"))
  await page.getByTestId("start").click()

  // Trip the selected district's breaker first.
  const threshold = await page.evaluate(
    () => window.__breakerGrid?.game.snapshot.level.failureThreshold ?? 0,
  )
  for (let i = 0; i < threshold; i++) {
    await page.getByTestId("inject-failure").click()
  }

  // Advance the clock past the cooldown → breaker goes HALF_OPEN.
  await page.getByTestId("advance-clock").click()
  const half = await page.evaluate(() => {
    const g = window.__breakerGrid
    if (!g) return null
    const id = g.game.snapshot.selectedDistrictId
    const d = g.game.snapshot.districts.find((x) => x.id === id)
    return d?.breaker.state ?? null
  })
  expect(half).toBe("half_open")

  // Predict: probe SUCCEEDS → CLOSED. (L2 evaluateProbe scripts a success probe.)
  await page.getByTestId("to-predict").click()
  await page.getByTestId("probe-success").click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "breaker-grid-L2")
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

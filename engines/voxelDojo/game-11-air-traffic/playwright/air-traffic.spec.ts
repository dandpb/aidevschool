import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * waves emit EVIDENCE console records with the voxeldojo schema. Concept math is proven in
 * Vitest (src/sim/balancer.test.ts); this spec proves the wiring inside a real browser.
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

test("boots the airport, plays L1 round-robin by clicking predicted pads, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // Play L1 through the public-API truth (deterministic), clicking the real HUD pad buttons.
  for (let i = 0; i < 12; i++) {
    const padId = await page.evaluate(() => {
      const hook = window.__airTraffic
      if (!hook) throw new Error("no test hook")
      return hook.game.predictTruthPad()
    })
    if (padId === "dropped") break
    await page.getByTestId(`pad-${padId}`).click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBeGreaterThanOrEqual(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U11-load-balancer")
  expect(first.project).toBe("11_load_balancer")
  expect(first.scenario_id).toBe("air-traffic-L1")
  expect(first.game).toBe("AIR TRAFFIC")
  expect(first.pass).toBe(true)
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBeGreaterThanOrEqual(
    1,
  )

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L2 health check: probe reveals the dead pad, avoiding it clears with zero errors", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__airTraffic?.game.loadLevel("L2"))
  await page.getByTestId("start").click()
  await page.getByTestId("probe").click()

  // round-robin skips the unhealthy pad → predictTruthPad returns only healthy pads
  for (let i = 0; i < 12; i++) {
    const padId = await page.evaluate(
      () => window.__airTraffic?.game.predictTruthPad() ?? "dropped",
    )
    if (padId === "dropped") break
    await page.getByTestId(`pad-${padId}`).click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "air-traffic-L2")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.metrics.errors).toBe(0)
  expect(record?.metrics.probe_fired).toBe(true)

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

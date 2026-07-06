import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * waves emit EVIDENCE console records with the voxeldojo schema. Concept math is proven in
 * Vitest (src/sim/shortener.test.ts); this spec proves the wiring inside a real browser.
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

test("boots the wormhole, plays L1 by typing predicted codes, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // Play L1 through the public API truth (deterministic), typing the real code into the field.
  for (let i = 0; i < 12; i++) {
    const phase = await page.evaluate(() => window.__wormhole?.game.snapshot.phase)
    if (phase !== "predicting") break
    const code = await page.evaluate(
      () => window.__wormhole?.game.predictedCodeForPending() ?? null,
    )
    if (!code) break
    await page.getByTestId("code-input").fill(code)
    await page.getByTestId("submit-code").click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U3-url-shortener")
  expect(first.project).toBe("03_url_shortener")
  expect(first.scenario_id).toBe("wormhole-L1")
  expect(first.pass).toBe(true)
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L4 resolve: picking salted resolves the forced collision and emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__wormhole?.game.loadLevel("L4"))
  await page.getByTestId("start").click()

  const collisionCode = await page.evaluate(
    () => window.__wormhole?.game.snapshot.collisionCode ?? null,
  )
  expect(collisionCode).not.toBeNull()

  await page.getByTestId("resolve-salted").click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "wormhole-L4")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.metrics.resolution_chosen).toBe("salted")
  expect(record?.metrics.resolved_unique).toBe(true)

  await page.screenshot({ path: ".logs/smoke-L4-cleared.png" })
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

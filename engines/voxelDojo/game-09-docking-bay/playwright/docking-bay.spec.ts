import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * waves emit EVIDENCE console records with the voxeldojo schema. Concept math is proven in
 * Vitest (src/sim/plugin.test.ts); this spec proves the wiring inside a real browser.
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

test("boots the bay, plays L1 by predicting dock/reject, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // Play L1 through the public API truth (deterministic), clicking the real HUD buttons.
  const pods = await page.evaluate(() => {
    const hook = window.__dockingBay
    if (!hook) throw new Error("no test hook")
    return hook.game.snapshot.pods.map((p) => ({ id: p.id, dock: hook.game.podWouldDock(p) }))
  })
  for (const p of pods) {
    const btn = p.dock ? `dock-yes-${p.id}` : `dock-no-${p.id}`
    await page.getByTestId(btn).click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U9-plugin-system")
  expect(first.project).toBe("09_plugin_system")
  expect(first.scenario_id).toBe("docking-bay-L1")
  expect(first.pass).toBe(true)
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L3 sandbox: classifying every invoked method correctly emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__dockingBay?.game.loadLevel("L3"))
  await page.getByTestId("start").click()

  const probes = await page.evaluate(() => {
    const hook = window.__dockingBay
    if (!hook) throw new Error("no test hook")
    const probe = hook.game.snapshot.probe
    if (!probe) throw new Error("no probe")
    return probe.invokedMethods.map((m) => ({ m, allow: hook.game.probeAllows(m) }))
  })
  for (const p of probes) {
    const btn = p.allow ? `allow-${p.m}` : `block-${p.m}`
    await page.getByTestId(btn).click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "docking-bay-L3")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)

  await page.screenshot({ path: ".logs/smoke-L3-cleared.png" })
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

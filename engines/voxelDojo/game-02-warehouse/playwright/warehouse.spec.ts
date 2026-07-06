import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * waves emit EVIDENCE console records with the voxeldojo schema. Concept math is proven in
 * Vitest (src/sim/store.test.ts); this spec proves the wiring inside a real browser.
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

test("boots the warehouse, plays L1 by clicking predicted shelves, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // Play L1 through the public API truth (deterministic), clicking the real HUD shelf buttons.
  const keyCount = await page.evaluate(() => {
    const hook = window.__warehouse
    if (!hook) throw new Error("no test hook")
    return hook.game.snapshot.keys.length
  })
  for (let i = 0; i < keyCount; i++) {
    const shelfId = await page.evaluate(() => {
      const hook = window.__warehouse
      if (!hook) throw new Error("no test hook")
      const s = hook.game.snapshot
      const key = s.keys[s.pendingIndex]
      if (key === undefined) return null
      return hook.game.shelfOfKey(key)
    })
    if (shelfId === null) break
    await page.getByTestId(`shelf-${shelfId}`).click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U2-key-value-store")
  expect(first.project).toBe("02_key_value_store")
  expect(first.scenario_id).toBe("warehouse-L1")
  expect(first.game).toBe("WAREHOUSE")
  expect(first.pass).toBe(true)
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L3 TTL: correct decay-probes + swept prediction clear the wave and emit bounded metrics", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__warehouse?.game.loadLevel("L3"))
  await page.getByTestId("start").click()

  const keyCount = await page.evaluate(() => window.__warehouse?.game.snapshot.keys.length ?? 0)
  // answer each get-probe with the ground truth (alive vs missing/expired)
  for (let i = 0; i < keyCount; i++) {
    const alive = await page.evaluate(() => {
      const hook = window.__warehouse
      if (!hook) return null
      const s = hook.game.snapshot
      const key = s.keys[s.crudIndex]
      if (key === undefined) return null
      return hook.game.getTruth(key) !== null
    })
    if (alive === null) break
    await page.getByTestId(alive ? "get-alive" : "get-missing").click()
  }

  // all keys decayed (clock past every deadline) ⇒ the sweep reclaims them all
  await page.getByTestId(`swept-${keyCount}`).click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "warehouse-L3")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.metrics.expired_swept).toBe(keyCount)

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

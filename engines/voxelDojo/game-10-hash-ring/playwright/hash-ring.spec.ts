import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * waves emit EVIDENCE console records with the voxeldojo schema. Concept math is proven in
 * Vitest (src/sim/ring.test.ts); this spec proves the wiring inside a real browser.
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

test("boots the ring, plays L1 by clicking predicted owners, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // Play L1 through the public API truth (deterministic), clicking the real HUD buttons.
  for (let i = 0; i < 12; i++) {
    const ownerId = await page.evaluate(() => {
      const hook = window.__hashRing
      if (!hook) throw new Error("no test hook")
      const s = hook.game.snapshot
      const key = s.keys[s.pendingKeyIndex]
      if (key === undefined) return null
      return hook.game.ownerOfKey(key)
    })
    if (ownerId === null) break
    await page.getByTestId(`station-${ownerId}`).click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U9-distributed-cache")
  expect(first.project).toBe("10_distributed_cache")
  expect(first.scenario_id).toBe("hash-ring-L1")
  expect(first.pass).toBe(true)
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L2 join: clicking the predicted loser resolves the wave and emits bounded metrics", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__hashRing?.game.loadLevel("L2"))
  await page.getByTestId("start").click()
  const loser = await page.evaluate(() => window.__hashRing?.game.snapshot.actualLoserId ?? null)
  expect(loser).not.toBeNull()
  await page.getByTestId(`station-${loser}`).click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "hash-ring-L2")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  const moved = record?.metrics.moved_ratio as number
  const theoretical = record?.metrics.theoretical_kn as number
  expect(moved).toBeLessThanOrEqual(theoretical * 1.75 + 0.02)

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

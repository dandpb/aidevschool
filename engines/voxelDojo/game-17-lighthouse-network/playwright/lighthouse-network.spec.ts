import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * waves emit EVIDENCE console records with the voxeldojo schema. Concept math is proven in
 * Vitest (src/sim/consensus.test.ts); this spec proves the wiring inside a real browser.
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

test("boots the network, plays L1 by acking to quorum, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // Predict the correct quorum (3 for a cluster of 5) via the HUD buttons.
  const quorum = await page.evaluate(() => window.__lighthouseNetwork?.game.quorumRequired())
  expect(quorum).toBe(3)
  await page.getByTestId(`quorum-${quorum}`).click()

  // Ack the first 3 lighthouses from the deterministic order → reaches quorum (the commit flash).
  const ackIds = await page.evaluate(() =>
    window.__lighthouseNetwork ? window.__lighthouseNetwork.game.snapshot.ackOrder.slice(0, 3) : [],
  )
  expect(ackIds).toHaveLength(3)
  for (const id of ackIds as string[]) {
    await page.getByTestId(`node-${id}`).click()
  }
  await page.getByTestId("resolve").click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U17-config-service")
  expect(first.project).toBe("17_distributed_config_service")
  expect(first.scenario_id).toBe("lighthouse-network-L1")
  expect(first.pass).toBe(true)
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L3 partition: predicting the majority side resolves the wave and emits a record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__lighthouseNetwork?.game.loadLevel("L3"))
  await page.getByTestId("start").click()
  // cluster=5, partitionSide=[lh-0,lh-1] (2, minority) → right (3) is the majority.
  await page.getByTestId("side-right").click()
  await page.getByTestId("resolve").click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find(
    (r) => r.scenario_id === "lighthouse-network-L3",
  )
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.metrics.left_can_commit).toBe(false)
  expect(record?.metrics.right_can_commit).toBe(true)

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

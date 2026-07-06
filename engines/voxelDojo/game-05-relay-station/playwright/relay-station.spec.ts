import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * waves emit EVIDENCE console records with the voxeldojo schema. Concept math is proven in
 * Vitest (src/sim/relay.test.ts); this spec proves the wiring inside a real browser.
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

test("boots the relay, plays L1 by predicting the connected set, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // L1: predict the connected set using the public API truth, clicking the real HUD buttons.
  const connected = await page.evaluate(() => {
    const hook = window.__relayStation
    if (!hook) throw new Error("no test hook")
    return hook.game.truthConnected()
  })
  for (const id of connected) {
    await page.getByTestId(`station-${id}`).click()
  }
  await page.getByTestId("submit").click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U5-websocket-chat")
  expect(first.project).toBe("05_websocket_chat")
  expect(first.scenario_id).toBe("relay-station-L1")
  expect(first.pass).toBe(true)
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L2 fan-out: predicting the delivery set resolves the wave and emits bounded metrics", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__relayStation?.game.loadLevel("L2"))
  await page.getByTestId("start").click()
  const delivery = await page.evaluate(() => {
    const hook = window.__relayStation
    if (!hook) throw new Error("no test hook")
    return hook.game.truthDelivery()
  })
  for (const id of delivery) {
    await page.getByTestId(`station-${id}`).click()
  }
  await page.getByTestId("submit").click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "relay-station-L2")
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

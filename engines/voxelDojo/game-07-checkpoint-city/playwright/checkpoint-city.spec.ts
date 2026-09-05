import { expect, test } from "@playwright/test"
import { collectEvidence, type EvidenceRecord } from "../../shared/testHelpers"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * waves emit EVIDENCE console records with the voxeldojo schema. The cryptographic truth
 * (real HMAC-SHA256, valid vs forged/tampered tokens) is proven in Vitest
 * (src/sim/middleware.test.ts); this spec proves the wiring inside a real browser and drives
 * the deterministic public API via the test hook.
 */

test("renders an actual WebGL canvas (not a blank shell)", async ({ page }) => {
  await page.goto("/")
  const hasContext = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#stage")
    if (!canvas) return false
    return canvas.getContext("webgl2") !== null || canvas.getContext("webgl") !== null
  })
  expect(hasContext).toBe(true)
})

test("boots the city, plays L1 by predicting each gate, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // Play L1 through the deterministic public API truth: every L1 request reaches the handler.
  const waveLen = await page.evaluate(() => window.__checkpointCity?.game.snapshot.wave.length ?? 0)
  expect(waveLen).toBeGreaterThan(0)
  for (let i = 0; i < waveLen; i++) {
    const answer = await page.evaluate(() => window.__checkpointCity?.game.pendingAnswer() ?? null)
    if (answer === null) break
    await page.getByTestId(`predict-${answer}`).click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U7-rest-api-auth")
  expect(first.project).toBe("07_rest_api_auth")
  expect(first.scenario_id).toBe("checkpoint-city-L1")
  expect(first.pass).toBe(true)
  expect(first.metrics.kind).toBe("voxeldoj-checkpoint-city")
  expect(first.metrics.prediction_accuracy).toBe(1)
  // Closed observation trace for the independent verifier: the player's bounded
  // inputs only; every wave answer is recomputed verifier-side from the fixed seed.
  expect(Array.isArray(first.observations?.predictions)).toBe(true)
  expect(first.observations?.kind).toBe("checkpoint-city-L1")
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L2 forged badge: predicting the ground-truth gate (auth vs handler) clears the wave", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__checkpointCity?.game.loadLevel("L2"))
  await page.getByTestId("start").click()

  const waveLen = await page.evaluate(() => window.__checkpointCity?.game.snapshot.wave.length ?? 0)
  for (let i = 0; i < waveLen; i++) {
    const answer = await page.evaluate(() => window.__checkpointCity?.game.pendingAnswer() ?? null)
    if (answer === null) break
    await page.getByTestId(`predict-${answer}`).click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "checkpoint-city-L2")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.metrics.kind).toBe("voxeldoj-checkpoint-city")
  expect(record?.metrics.prediction_accuracy).toBe(1)
  expect(record?.observations?.kind).toBe("checkpoint-city-L2")
  expect(Array.isArray(record?.observations?.predictions)).toBe(true)
  // the wave must have exercised at least one auth reject (the HMAC lesson)
  expect(record?.metrics.reached_handler).toBeDefined()

  await page.screenshot({ path: ".logs/smoke-L2-forged-cleared.png" })
})

test("L3 rate limit: predicting the boundary (cap+1 rejects at rate-limit) clears", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__checkpointCity?.game.loadLevel("L3"))
  await page.getByTestId("start").click()

  const waveLen = await page.evaluate(() => window.__checkpointCity?.game.snapshot.wave.length ?? 0)
  for (let i = 0; i < waveLen; i++) {
    const answer = await page.evaluate(() => window.__checkpointCity?.game.pendingAnswer() ?? null)
    if (answer === null) break
    await page.getByTestId(`predict-${answer}`).click()
  }

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "checkpoint-city-L3")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.observations?.kind).toBe("checkpoint-city-L3")
  expect(Array.isArray(record?.observations?.predictions)).toBe(true)

  await page.screenshot({ path: ".logs/smoke-L3-rate-limit-cleared.png" })
})

test("L4 order matters: restoring the wall order and predicting auth clears", async ({ page }) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__checkpointCity?.game.loadLevel("L4"))
  await page.getByTestId("start").click()

  // given order is rate-limit, logging, auth — move rate-limit to the innermost slot
  await page.getByTestId("move-0-down").click()
  await page.getByTestId("move-1-down").click()
  await expect(page.getByTestId("order-readout")).toContainText("logging → auth → rate-limit")

  // the probe is a forged token: under logging → auth → rate-limit it is rejected at auth
  await page.getByTestId("gate-auth").click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "checkpoint-city-L4")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.metrics.kind).toBe("voxeldoj-checkpoint-city")
  expect(record?.metrics.reorder_correct).toBe(true)
  expect(record?.metrics.probe_prediction_ok).toBe(true)
  expect(record?.observations).toEqual({
    kind: "checkpoint-city-L4",
    order: ["logging", "auth", "rate-limit"],
    probePrediction: "auth",
  })

  await page.screenshot({ path: ".logs/smoke-L4-order-cleared.png" })
})

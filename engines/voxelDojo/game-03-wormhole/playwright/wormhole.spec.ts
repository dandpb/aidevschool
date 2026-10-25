import { expect, test } from "@playwright/test"
import { collectEvidence, type EvidenceRecord } from "../../shared/testHelpers"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * waves emit EVIDENCE console records with the voxeldojo schema. Concept math is proven in
 * Vitest (src/sim/shortener.test.ts); this spec proves the wiring inside a real browser.
 */

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

  await expect(page.getByTestId("hud-status")).toContainText("concluída")
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

  await expect(page.getByTestId("hud-status")).toContainText("concluída")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "wormhole-L4")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.metrics.resolution_chosen).toBe("salted")
  expect(record?.metrics.resolved_unique).toBe(true)

  await page.screenshot({ path: ".logs/smoke-L4-cleared.png" })
})

test("L3 collision counter: HUD collisions-so-far tracks actual collisions during predicting", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__wormhole?.game.loadLevel("L3"))
  await expect(page.getByTestId("hud-title")).toContainText("L3")
  await page.getByTestId("start").click()

  // Deliberately pessimistic play: predict "collide" for EVERY url, so the count of
  // *predicted* collisions grows every step. The HUD counter and the wave metrics must
  // track *actual* collisions only — the first url can never collide with an empty map,
  // so from step 1 on the two counts differ deterministically (negative control).
  const urlCount = 6
  for (let i = 0; i < urlCount; i++) {
    const phase = await page.evaluate(() => window.__wormhole?.game.snapshot.phase)
    expect(phase).toBe("predicting")

    const actualSoFar = await page.evaluate(
      () =>
        window.__wormhole?.game.snapshot.collisionPredictions.filter((p) => p.actualCollision)
          .length ?? -1,
    )
    await expect(page.getByTestId("collisions-so-far")).toHaveText(
      `colisões detectadas: ${actualSoFar}`,
    )
    if (i >= 1) expect(actualSoFar).toBeLessThan(i) // counter is NOT counting predictions

    await page.getByTestId("predict-collide").click()
  }

  // All-true predictions on a wave with a single forced collision stay below the gate.
  await expect(page.getByTestId("hud-status")).toContainText("ainda não atendido")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "wormhole-L3")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(false)
  expect(record?.metrics.collision_predictions).toBe(6)
  const actualTotal = await page.evaluate(
    () =>
      window.__wormhole?.game.snapshot.collisionPredictions.filter((p) => p.actualCollision)
        .length ?? -1,
  )
  expect(record?.metrics.collisions_present).toBe(actualTotal)
  expect(record?.metrics.collisions_present).toBeLessThan(6)

  await page.screenshot({ path: ".logs/smoke-L3-collision-counter.png" })
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

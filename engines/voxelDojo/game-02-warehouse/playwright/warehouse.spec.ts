import { expect, type Page, test } from "@playwright/test"
import { collectEvidence, type EvidenceRecord } from "../../shared/testHelpers"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * waves emit EVIDENCE console records with the voxeldojo schema. Concept math is proven in
 * Vitest (src/sim/store.test.ts); this spec proves the wiring inside a real browser.
 */

/** Plays L1 deterministically through the public API truth (shared by smoke + continuity). */
async function playL1ToCompletion(page: Page): Promise<number> {
  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()
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
  await expect(page.getByTestId("hud-status")).toContainText("concluída")
  return keyCount
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

  await expect(page.getByTestId("hud-status")).toContainText("concluída")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U2-key-value-store")
  expect(first.project).toBe("02_key_value_store")
  expect(first.scenario_id).toBe("kv-warehouse-L1")
  expect(first.game).toBe("KV WAREHOUSE")
  expect(first.pass).toBe(true)
  expect(first.observations).toMatchObject({
    kind: "warehouse-L1",
    predictions: expect.arrayContaining([
      expect.objectContaining({ key: expect.any(String), shelf: expect.any(Number) }),
    ]),
  })
  expect(first.observations.predictions).toHaveLength(keyCount)
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

  await expect(page.getByTestId("hud-status")).toContainText("concluída")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "kv-warehouse-L3")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.metrics.expired_swept).toBe(keyCount)
  expect(record?.observations).toMatchObject({
    kind: "warehouse-L3",
    predictedSwept: keyCount,
  })
  expect(record?.observations.probes).toHaveLength(keyCount)

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

test("continuity re-entry: deterministic restart without corrupted evidence (AID-987/T1)", async ({
  page,
}) => {
  // Scenario `voxel-standalone-return-reentry`: the learner completed the
  // declared loop, closed the game, and reopens it. Re-entry must restart the
  // deterministic loop from its briefing state, must NOT resurrect the prior
  // session's in-memory evidence (it is session-bound by contract), and a
  // replay must emit a fresh record with the same deterministic core.
  const firstSessionLines: string[] = []
  page.on("console", (msg) => firstSessionLines.push(msg.text()))

  await page.goto("/")
  const firstKeyCount = await playL1ToCompletion(page)
  const firstRecords = collectEvidence(firstSessionLines) as EvidenceRecord[]
  expect(firstRecords.length).toBe(1)
  const firstRecord = firstRecords[0]
  expect(firstRecord.pass).toBe(true)
  // The local helper type predates attempt_id; read it through a narrow view.
  const firstAttemptId = (firstRecord as { attempt_id?: string }).attempt_id
  expect(typeof firstAttemptId).toBe("string")
  // The learner's handoff artifact: the raw record they located before closing.
  const savedArtifact = { ...firstRecord } as Record<string, unknown>

  // Re-entry (same browser profile): the game reopens from scratch.
  await page.reload()

  // Deterministic restart: briefing L1 again, no stale cleared state.
  await expect(page.getByTestId("hud-title")).toContainText("L1")
  const hudStatus = await page.getByTestId("hud-status").textContent()
  expect(hudStatus).not.toContain("concluída")
  // The in-memory evidence channel is session-bound: no resurrection, no corruption.
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(0)

  // Replay: same deterministic core (the attempt counter is session-bound, so
  // both sessions legitimately number their first attempt "attempt-1"); the
  // fresh emission is proven by the new timestamp and the window channel
  // holding exactly one record — a new emission, not a resurrection.
  const secondSessionLines: string[] = []
  page.on("console", (msg) => secondSessionLines.push(msg.text()))
  const secondKeyCount = await playL1ToCompletion(page)
  expect(secondKeyCount).toBe(firstKeyCount)
  const secondRecords = collectEvidence(secondSessionLines) as EvidenceRecord[]
  expect(secondRecords.length).toBe(1)
  const secondRecord = secondRecords[0]
  expect(secondRecord.scenario_id).toBe(firstRecord.scenario_id)
  expect(secondRecord.unit_id).toBe(firstRecord.unit_id)
  expect(secondRecord.pass).toBe(true)
  expect((secondRecord as { attempt_id?: string }).attempt_id).toBe(firstAttemptId)
  expect((secondRecord as { ts?: string }).ts).not.toBe((firstRecord as { ts?: string }).ts)
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  // The saved artifact from the first session stays valid and uncorrupted:
  // still the same record the learner handed off, untouched by the replay.
  expect(savedArtifact.attempt_id).toBe(firstAttemptId)
  expect(savedArtifact.scenario_id).toBe("kv-warehouse-L1")
  expect(savedArtifact.pass).toBe(true)
})

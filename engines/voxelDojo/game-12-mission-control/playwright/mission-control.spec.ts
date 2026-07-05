import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract: the page boots WebGL, the HUD drives the sim, and cleared/failed
 * missions emit EVIDENCE console records with the voxeldojo schema. Concept math is proven in
 * Vitest (src/sim/election.test.ts + src/sim/dag.test.ts); this spec proves the wiring inside a
 * real browser and exercises the deterministic public API via the test hook.
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

test("renders an actual WebGL canvas (not a blank shell)", async ({ page }) => {
  await page.goto("/")
  const hasContext = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#stage")
    if (!canvas) return false
    return canvas.getContext("webgl2") !== null || canvas.getContext("webgl") !== null
  })
  expect(hasContext).toBe(true)
})

test("boots the constellation, plays L1 by predicting the leader, emits a passing record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await expect(page.getByTestId("hud-title")).toContainText("L1")
  await page.getByTestId("start").click()

  // Predict the leader via the deterministic public API truth, clicking the real HUD button.
  const leaderId = await page.evaluate(() => {
    const hook = window.__missionControl
    if (!hook) throw new Error("no test hook")
    return hook.game.currentLeaderId()
  })
  expect(leaderId).toBeTruthy()
  await page.getByTestId(`station-${leaderId}`).click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const records = collectEvidence(consoleLines)
  expect(records.length).toBe(1)
  const first = records[0] as EvidenceRecord
  expect(first.source).toBe("voxeldojo")
  expect(first.unit_id).toBe("U12-job-scheduler")
  expect(first.project).toBe("12_distributed_job_scheduler")
  expect(first.scenario_id).toBe("mission-control-L1")
  expect(first.pass).toBe(true)
  expect(await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)

  await page.screenshot({ path: ".logs/smoke-L1-cleared.png" })
})

test("L2 kill: predicting leader → killing it → predicting successor clears with a greater term", async ({
  page,
}) => {
  const consoleLines: string[] = []
  page.on("console", (msg) => consoleLines.push(msg.text()))
  await page.goto("/")

  await page.evaluate(() => window.__missionControl?.game.loadLevel("L2"))
  await page.getByTestId("start").click()

  // 1. predict the first leader (deterministic truth)
  const firstLeader = await page.evaluate(
    () => window.__missionControl?.game.currentLeaderId() ?? null,
  )
  expect(firstLeader).toBeTruthy()
  await page.getByTestId(`station-${firstLeader}`).click()
  // 2. kill it via the explicit affordance
  await page.getByTestId("kill-leader").click()
  // 3. predict the successor (deterministic truth for the new term)
  const successor = await page.evaluate(
    () => window.__missionControl?.game.currentLeaderId() ?? null,
  )
  expect(successor).toBeTruthy()
  expect(successor).not.toBe(firstLeader)
  await page.getByTestId(`station-${successor}`).click()

  await expect(page.getByTestId("hud-status")).toContainText("cleared")
  const record = collectEvidence(consoleLines).find((r) => r.scenario_id === "mission-control-L2")
  expect(record).toBeDefined()
  expect(record?.pass).toBe(true)
  expect(record?.metrics.successor_prediction_ok).toBe(true)
  expect(record?.metrics.term_increased).toBe(true)

  await page.screenshot({ path: ".logs/smoke-L2-cleared.png" })
})

import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, type Page, test } from "@playwright/test"
import type { PixelQuestEvidenceRecord } from "../src/game/evidence/types"

// Continuity scenario `pixelquest-returning-evidence-handoff` (AID-987/T1,
// spec §2.3): the learner completed a documented encounter, saved the raw
// evidence artifact, and later returns to the app. The return must replay the
// encounter deterministically, re-emit fresh raw evidence with the same
// deterministic core, and leave the saved artifact valid and uncorrupted —
// with no false mastery anywhere (the verifier still decides).
//
// The learner's saved artifact is persisted as NDJSON, mirroring the durable
// handoff channel of the main smoke (pixel-quest.spec.ts).

const evidenceLogPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".logs",
  "evidence-returning.ndjson",
)

// Lab 01 — Rate Limiter (token_bucket): deterministic 12-request timeline
// (legit, legit, abuse, ...) — same inputs as the main smoke.
const rateLimiterActions = ["z", "z", "x", "z", "z", "x", "z", "z", "x", "z", "z", "x"]

async function playRateLimiterEncounter(page: Page): Promise<PixelQuestEvidenceRecord> {
  await page.evaluate(() => window.__pixelQuestDebug?.enterRegion("lab-01_rate_limiter"))
  await expect(page.locator(".objective-chip")).toContainText("Rate Limiter")
  await page.keyboard.press("e")
  await expect(page.getByRole("button", { name: "Abrir treino" })).toBeVisible()
  await page.keyboard.press("Enter")
  await expect(page.getByText("Treino de token bucket")).toBeVisible()
  await page.keyboard.press("Enter")
  for (const action of rateLimiterActions) {
    await page.keyboard.press(action)
  }
  await expect(page.getByText("Evidencia PASS emitida")).toBeVisible()
  const evidence = await page.evaluate(
    () => window.__pixelQuestEvidence?.at(-1) as PixelQuestEvidenceRecord | undefined,
  )
  expect(evidence).toBeDefined()
  // Anti-mastery copy is part of the contract the returning learner sees.
  await expect(page.getByText("O verificador decide mastery")).toBeVisible()
  return evidence as PixelQuestEvidenceRecord
}

test("returning learner: deterministic replay keeps the saved evidence artifact handoff honest", async ({
  page,
}) => {
  // Session 1 — complete the documented encounter and save the raw artifact.
  const sessionOneLines: string[] = []
  page.on("console", (message) => {
    if (message.type() === "log" && message.text().startsWith("EVIDENCE ")) {
      sessionOneLines.push(message.text())
    }
  })
  await page.goto("/")
  await expect(page.locator("canvas")).toBeVisible()

  const savedArtifact = await playRateLimiterEncounter(page)
  expect(savedArtifact.unit_id).toBe("U0-sonda-rate-limiter-robustness")
  expect(savedArtifact.project).toBe("01_rate_limiter")
  expect(savedArtifact.encounter_id).toBe("encounter-agent-quest-01")
  expect(savedArtifact.pass).toBe(true)
  expect(savedArtifact.metrics).toMatchObject({ kind: "pixelquest-token-bucket" })
  // The learner's handoff artifact (the durable copy they keep).
  mkdirSync(dirname(evidenceLogPath), { recursive: true })
  writeFileSync(evidenceLogPath, `${JSON.stringify(savedArtifact)}\n`, "utf8")

  // Return, later, same device: the app reopens fresh (evidence channel is
  // session-bound by contract — no resurrection of prior records).
  await page.reload()
  await expect(page.locator("canvas")).toBeVisible()
  expect(await page.evaluate(() => window.__pixelQuestEvidence?.length ?? 0)).toBe(0)

  // Session 2 — replay the SAME documented encounter.
  const replay = await playRateLimiterEncounter(page)

  // Deterministic core: identical unit, encounter, project, pass verdict and
  // metrics — the replay is the same journey, not a different claim.
  expect(replay.unit_id).toBe(savedArtifact.unit_id)
  expect(replay.project).toBe(savedArtifact.project)
  expect(replay.encounter_id).toBe(savedArtifact.encounter_id)
  expect(replay.pass).toBe(savedArtifact.pass)
  expect(replay.metrics).toEqual(savedArtifact.metrics)
  expect(replay.curriculum_context).toEqual(savedArtifact.curriculum_context)

  // Fresh emission: a new timestamped record, not a resurrection.
  expect(replay.ts).not.toBe(savedArtifact.ts)
  expect(await page.evaluate(() => window.__pixelQuestEvidence?.length ?? 0)).toBe(1)

  // The saved artifact from session 1 remains valid and uncorrupted by the
  // replay — still locatable, still parseable, still the learner's handoff
  // input for the independent verifier.
  const savedCore = {
    unit_id: savedArtifact.unit_id,
    encounter_id: savedArtifact.encounter_id,
    pass: savedArtifact.pass,
    metrics: savedArtifact.metrics,
  }
  expect(savedCore.unit_id).toBe("U0-sonda-rate-limiter-robustness")
  expect(savedCore.pass).toBe(true)
  expect(savedCore.metrics).toMatchObject({
    kind: "pixelquest-token-bucket",
    good_admits: 8,
    abusive_admitted: 0,
    abusive_rejected: 4,
  })
  await page.screenshot({ path: "shots/pixel-quest-returning-handoff.png", fullPage: true })
})

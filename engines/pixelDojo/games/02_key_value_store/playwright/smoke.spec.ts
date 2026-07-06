import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

// Smoke test for the KV Warehouse wave. Drives the deterministic
// defaultWave() (src/game/wave.ts) to a PASS via real keyboard input — the
// hash is sum-of-char-codes mod 8 (documented in the HUD briefing), so each
// op's target shelf is computed from the same hashKey() the store uses.
//
// Wave ops (1-indexed for the HUD):
//   1 SET user:42     -> shelf 7   (Z)
//   2 SET cart:9      -> shelf 5   (Z)
//   3 GET user:42     -> shelf 7   (X, HIT)
//   4 EXPIRE user:42  -> shelf 7   (V, TTL 1200ms)
//   -- wait for the TTL ring to drain below zero --
//   5 GET user:42     -> shelf 7   (X, MISS — expired)
//   6 SET user:42     -> shelf 7   (Z, overwrite persistent)
//   7 GET user:42     -> shelf 7   (X, HIT)
//   8 DEL cart:9      -> shelf 5   (C)
//   9 GET cart:9      -> shelf 5   (X, MISS — deleted)

const here = dirname(fileURLToPath(import.meta.url))
const shotsDir = join(here, "..", "shots")

test("plays the KV Warehouse wave and emits PASS evidence", async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text())
    }
  })

  const evidenceMessages: string[] = []
  page.on("console", (message) => {
    if (message.text().startsWith("EVIDENCE ")) {
      evidenceMessages.push(message.text())
    }
  })

  await page.goto("/")
  await expect(page.locator("canvas")).toBeVisible()
  await expect(page.locator(".hud-title")).toContainText("KV Warehouse")
  await expect(page.locator(".hud-briefing").first()).toContainText("hash(key)%8")

  // Ops 1-4: navigate and resolve.
  // Start: target shelf 0. Op 1 (SET user:42) wants shelf 7.
  const firstRun = [
    "ArrowLeft", // 0 -> 7
    "z", // op 1: SET user:42 @ shelf 7
    "ArrowLeft",
    "ArrowLeft", // 7 -> 5
    "z", // op 2: SET cart:9 @ shelf 5
    "ArrowRight",
    "ArrowRight", // 5 -> 7
    "x", // op 3: GET user:42 @ shelf 7 (HIT)
    "v", // op 4: EXPIRE user:42 @ shelf 7 (TTL 1200ms)
  ]
  for (const key of firstRun) {
    await page.keyboard.press(key)
  }

  // Wait for the TTL (1200ms) to drain before the GET-MISS at op 5.
  await page.waitForTimeout(1400)

  // Ops 5-9: the rest of the wave. Shelf is 7 after op 4; op 8/9 need shelf 5.
  const secondRun = [
    "x", // op 5: GET user:42 @ shelf 7 (MISS — expired)
    "z", // op 6: SET user:42 @ shelf 7 (overwrite persistent)
    "x", // op 7: GET user:42 @ shelf 7 (HIT)
    "ArrowLeft",
    "ArrowLeft", // 7 -> 5
    "c", // op 8: DEL cart:9 @ shelf 5
    "x", // op 9: GET cart:9 @ shelf 5 (MISS — deleted)
  ]
  for (const key of secondRun) {
    await page.keyboard.press(key)
  }

  // The last op emits the evidence record synchronously. Poll for the line.
  await expect
    .poll(async () => evidenceMessages.length, { timeout: 5000 })
    .toBeGreaterThanOrEqual(1)

  const evidenceLine = evidenceMessages[0]
  if (evidenceLine === undefined) {
    throw new Error("EVIDENCE line was not captured before assertion")
  }
  expect(evidenceLine).toMatch(/^EVIDENCE /)
  const record = JSON.parse(evidenceLine.replace(/^EVIDENCE /, ""))
  expect(record.schema).toBe("02_key_value_store-v1")
  expect(record.unit_id).toBe("02_key_value_store")
  expect(record.encounter_id).toBe("kv-warehouse-01")
  expect(record.game).toBe("KV Warehouse")
  expect(record.pass).toBe(true)
  expect(Date.now() - Date.parse(record.ts)).toBeLessThan(10_000)
  expect(Array.isArray(record.gates)).toBe(true)
  for (const gate of record.gates) {
    expect(gate.passed).toBe(true)
  }

  const metrics = record.metrics
  expect(metrics.puts_total).toBe(3)
  expect(metrics.puts_correct).toBe(3)
  expect(metrics.gets_total).toBe(2)
  expect(metrics.gets_correct).toBe(2)
  expect(metrics.misses_total).toBe(2)
  expect(metrics.misses_correct).toBe(2)
  expect(metrics.dels_total).toBe(1)
  expect(metrics.dels_correct).toBe(1)
  expect(metrics.expire_total).toBe(1)
  expect(metrics.expire_correct).toBe(1)
  expect(metrics.wrong_bucket_routes).toBe(0)
  expect(metrics.stale_reads).toBe(0)
  expect(metrics.overflow).toBe(false)

  // Side-effect contract (EVIDENCE_CONTRACT.md, plan slice §11): the producer
  // never publishes learning-state channels and never touches learner storage.
  const sideEffects = await page.evaluate(() => ({
    gameEvidenceSet: "__gameEvidence" in window,
    learningStatePublished: "__pixelQuestLearningState" in window,
    lsKeys: Object.keys(localStorage),
  }))
  expect(sideEffects.gameEvidenceSet).toBe(true)
  expect(sideEffects.learningStatePublished).toBe(false)
  expect(sideEffects.lsKeys).not.toContain("learning_state")
  expect(sideEffects.lsKeys).not.toContain("units_log")
  expect(sideEffects.lsKeys).not.toContain("mastered")

  await expect(page.locator(".hud-banner.pass")).toBeVisible()
  mkdirSync(shotsDir, { recursive: true })
  await page.screenshot({
    path: join(shotsDir, "02_key_value_store.png"),
    fullPage: true,
  })

  // Persist the evidence record for the verifier + the output copy step.
  const logsDir = join(here, "..", ".logs")
  mkdirSync(logsDir, { recursive: true })
  writeFileSync(join(logsDir, "evidence.json"), JSON.stringify(record, null, 2), "utf8")

  expect(runtimeErrors).toEqual([])
})

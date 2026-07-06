import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

// Smoke test for the Ring Keeper wave. Drives the deterministic
// defaultWaveSteps() to a PASS via real keyboard input.
//
// The wave is 8 scripted steps (PLAN slice §4 + defaultWave.ts):
//   1 SPACE  release "a"   → shard-B
//   2 SPACE  release "f"   → shard-A
//   3 SPACE  release "k"   → shard-A
//   4 A      add shard-D   → splits shard-C's arc (hot key incoming)
//   5 SPACE  release "p"   → shard-D (HOT key — balanced)
//   6 SPACE  release "u"   → shard-B
//   7 SPACE  release "z"   → shard-A (overflow)
//   8 X      remove shard-A → churn; f/k/z re-home to shard-D (3 remapped)

const here = dirname(fileURLToPath(import.meta.url))
const shotsDir = join(here, "..", "shots")

test("plays the Ring Keeper wave and emits PASS evidence", async ({ page }) => {
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
  await expect(page.locator(".hud-title")).toContainText("Ring Keeper")
  await expect(page.locator(".hud-briefing").first()).toContainText("next node clockwise")

  // Drive all 8 steps in order. The wave expects exactly these keys.
  const inputs = ["Space", "Space", "Space", "a", "Space", "Space", "Space", "x"]
  for (const key of inputs) {
    await page.keyboard.press(key)
    // Tiny pause so the render loop + react state settle between keystrokes.
    await page.waitForTimeout(60)
  }

  // The last step emits the evidence record synchronously. Poll for the line.
  await expect
    .poll(async () => evidenceMessages.length, { timeout: 5000 })
    .toBeGreaterThanOrEqual(1)

  const evidenceLine = evidenceMessages[0] ?? ""
  expect(evidenceLine).toMatch(/^EVIDENCE /)
  const record = JSON.parse(evidenceLine.replace(/^EVIDENCE /, ""))
  expect(record.schema).toBe("10_distributed_cache-v1")
  expect(record.unit_id).toBe("10_distributed_cache")
  expect(record.project).toBe("10_distributed_cache")
  expect(record.encounter_id).toBe("ring-keeper-01")
  expect(record.game).toBe("Ring Keeper")
  expect(record.pass).toBe(true)
  expect(Date.now() - Date.parse(record.ts)).toBeLessThan(10_000)
  expect(Array.isArray(record.gates)).toBe(true)
  expect(record.gates.length).toBeGreaterThanOrEqual(6)
  for (const gate of record.gates) {
    expect(gate.passed).toBe(true)
  }

  const metrics = record.metrics
  expect(metrics.kind).toBe("threejs-ring-keeper")
  expect(metrics.wave_cleared).toBe(true)
  expect(metrics.keys_routed).toBe(6)
  expect(metrics.wave_target).toBe(6)
  expect(metrics.misroutes).toBe(0)
  expect(metrics.keys_remapped).toBe(3)
  expect(metrics.remap_budget).toBe(5)
  expect(metrics.churn_events_survived).toBe(2)
  expect(metrics.node_adds).toBe(1)
  expect(metrics.node_removes).toBe(1)
  expect(metrics.hot_key_balanced).toBe(true)
  expect(metrics.spills).toBe(0)
  expect(metrics.spill_budget).toBe(2)
  expect(metrics.strategies_used).toEqual(["ring"])
  expect(metrics.modn_used_at_churn).toBe(false)
  expect(metrics.node_count_final).toBe(3)

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
    path: join(shotsDir, "10_distributed_cache.png"),
    fullPage: true,
  })
  // Persist the evidence record alongside the screenshot so downstream
  // tooling (verifier / output dir copy) has a stable on-disk artifact.
  writeFileSync(
    join(shotsDir, "10_distributed_cache.evidence.json"),
    JSON.stringify(record, null, 2),
  )
  expect(runtimeErrors).toEqual([])
})

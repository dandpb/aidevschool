import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

// Drives the Quorum Citadel 3D scene to its win state under Playwright and
// captures the emitted EVIDENCE record. The wave is a fixed sequence of five
// write orbs:
//   1. authorized + non-partitioned  → Z (commit)
//   2. authorized + non-partitioned  → Z (commit)
//   3. authorized + non-partitioned  → Z (commit)
//   4. UNAUTHORIZED                  → X (reject, ACL)
//   5. authorized + PARTITIONED      → X (reject, no quorum)
// After the fifth action the wave clears and the scene emits
// `EVIDENCE {...}` with pass:true.

const here = dirname(fileURLToPath(import.meta.url))
const evidenceLogPath = join(here, "..", ".logs", "evidence.ndjson")

test("plays the Quorum Citadel wave to PASS and emits evidence", async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text())
    }
  })

  const evidenceLines: string[] = []
  page.on("console", (message) => {
    if (message.text().startsWith("EVIDENCE ")) {
      evidenceLines.push(message.text())
    }
  })

  await page.goto("/")
  await expect(page.locator("canvas")).toBeVisible()
  await expect(page.locator(".wave-banner")).toContainText("WAVE 1")
  await expect(page.locator(".controls-hint")).toContainText("SPACE")

  // Begin the wave.
  await page.keyboard.press("Space")

  // Confirm the scene shows the first write orb.
  await expect(page.locator(".orb-panel")).toContainText("value: payments.retry_limit=4")
  await expect(page.locator(".orb-panel")).toContainText("authorized")

  // Drive the five orbs in order: Z Z Z X X.
  // Orb 1 — healthy commit.
  await page.keyboard.press("z")
  await expect(page.locator(".orb-panel")).toContainText("value: feature.shipping_v2=true")

  // Orb 2 — healthy commit.
  await page.keyboard.press("z")
  await expect(page.locator(".orb-panel")).toContainText("value: payments.fee=0.99")

  // Orb 3 — healthy commit.
  await page.keyboard.press("z")
  await expect(page.locator(".orb-panel")).toContainText("value: admin.debug=true")
  await expect(page.locator(".orb-panel")).toContainText("UNAUTHORIZED")

  // Orb 4 — ACL trap, must be rejected.
  await page.keyboard.press("x")
  await expect(page.locator(".orb-panel")).toContainText("value: cache.ttl=30")
  await expect(page.locator(".orb-panel")).toContainText("PARTITION")

  // Orb 5 — partition trap, must be rejected.
  await page.keyboard.press("x")

  // Wave clear banner.
  await expect(page.locator(".result-banner")).toContainText("WAVE CLEAR", { timeout: 10_000 })
  await expect(page.locator(".result-banner")).toHaveAttribute("data-state", "pass")

  // Evidence record was published on the window channel.
  const record = await page.evaluate(() => window.__gameEvidence)
  expect(record).toBeTruthy()
  expect(record?.schema).toBe("17_distributed_config_service-v1")
  expect(record?.source).toBe("quorumdoj")
  expect(record?.unit_id).toBe("17_distributed_config_service")
  expect(record?.project).toBe("17_distributed_config_service")
  expect(record?.encounter_id).toBe("quorum-citadel-01")
  expect(record?.game).toBe("Quorum Citadel")
  expect(record?.pass).toBe(true)
  expect(record?.metrics?.kind).toBe("threejs-quorum-consensus")
  expect(record?.metrics?.writes_proposed).toBe(5)
  expect(record?.metrics?.writes_committed_quorum).toBe(3)
  expect(record?.metrics?.writes_committed_no_quorum).toBe(0)
  expect(record?.metrics?.acl_leaked).toBe(0)
  expect(record?.metrics?.writes_rejected_acl).toBe(1)
  expect(record?.metrics?.writes_rejected_partition).toBe(1)
  expect(record?.metrics?.partition_events_total).toBe(1)
  expect(record?.metrics?.watchers_notified_in_budget).toBe(9)
  expect(record?.metrics?.watchers_notified_late).toBe(0)
  expect(record?.metrics?.watchers_missed).toBe(0)
  expect(record?.metrics?.stale_reads_served).toBe(0)
  expect(record?.metrics?.monolith_damage).toBe(0)
  expect(record?.metrics?.consensus_p95_ms).toBeGreaterThan(0)
  expect(record?.metrics?.watch_notify_p95_ms).toBeGreaterThan(0)
  expect(record?.metrics?.consensus_p95_ms).toBeGreaterThan(
    record?.metrics?.watch_notify_p95_ms ?? 0,
  )
  // Every gate must report passed:true.
  const failingGates = (record?.gates ?? []).filter((g: { passed: boolean }) => !g.passed)
  expect(failingGates).toEqual([])

  // The EVIDENCE console line was emitted exactly once.
  expect(evidenceLines).toHaveLength(1)
  const parsed = JSON.parse(evidenceLines[0]?.slice("EVIDENCE ".length) ?? "{}")
  expect(parsed.pass).toBe(true)

  // Persist the NDJSON channel consumed by engines/pixelDojo/verifier.
  mkdirSync(dirname(evidenceLogPath), { recursive: true })
  writeFileSync(evidenceLogPath, `${JSON.stringify(parsed)}\n`, "utf8")

  // Side-effect contract: the game never publishes learner state or touches
  // gate-owned localStorage keys.
  const sideEffects = await page.evaluate(() => ({
    learningStatePublished: "__pixelQuestLearningState" in window,
    gameEvidencePublished: "__gameEvidence" in window,
    localStorageKeys: Object.keys(localStorage),
  }))
  expect(sideEffects.learningStatePublished).toBe(false)
  expect(sideEffects.gameEvidencePublished).toBe(true)
  expect(sideEffects.localStorageKeys).not.toContain("learning_state")
  expect(sideEffects.localStorageKeys).not.toContain("units_log")
  expect(sideEffects.localStorageKeys).not.toContain("mastered")

  // The canvas rendered something — pixel data non-trivial.
  const dataUrlLength = await page.evaluate(() => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement | null
    if (!canvas) return 0
    return canvas.toDataURL("image/png").length
  })
  expect(dataUrlLength).toBeGreaterThan(1000)

  await page.screenshot({ path: "shots/17_distributed_config_service.png", fullPage: true })
  expect(runtimeErrors).toEqual([])
})

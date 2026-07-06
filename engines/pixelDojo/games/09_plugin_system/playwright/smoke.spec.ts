import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

// Smoke test for the Plugin Docking Bay. Drives the deterministic wave
// (alpha + beta + gamma) to a clean wave-clear, asserts the EVIDENCE record
// matches the plan's pass rule, and persists the record to:
//   .logs/evidence.ndjson   (single-line NDJSON, mirrors the producer contract)
// plus the screenshot at shots/09_plugin_system.png.

const evidenceLogPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".logs",
  "evidence.ndjson",
)

const EVIDENCE_RE = /^EVIDENCE /

test("plays the Plugin Docking Bay wave and emits pass=true evidence", async ({ page }) => {
  const runtimeErrors: string[] = []
  const evidenceLines: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text())
    }
    if (EVIDENCE_RE.test(message.text())) {
      evidenceLines.push(message.text())
    }
  })

  await page.goto("/")

  // Wait for the scene to boot and the wave to be live.
  await expect(page.locator(".objective-chip")).toContainText("Plugin Docking Bay")
  await expect(page.locator(".status-strip")).toContainText("WAVE-RUNNING")
  await expect(page.locator(".phase-strip")).toContainText("TARGET: alpha")
  await expect(page.locator("canvas")).toBeVisible()

  // ---- alpha: load → init → sandbox → start → (deny undeclared) → stop → unload ----
  await page.keyboard.press("z") // spawning -> loaded
  await expect(page.locator(".phase-strip")).toContainText("INIT")
  await page.keyboard.press("z") // loaded -> inited
  await expect(page.locator(".phase-strip")).toContainText("SANDBOX")
  await page.keyboard.press("s") // sandbox on
  await expect(page.locator(".phase-strip")).toContainText("SANDBOXED")
  await page.keyboard.press("z") // inited -> running
  // Wait for the undeclared-capability prompt to surface (>= 600 ms running).
  await expect(page.locator(".prompt-panel")).toBeVisible({ timeout: 5000 })
  await expect(page.locator(".prompt-panel")).toContainText("fs:/etc")
  await page.keyboard.press("x") // deny
  await expect(page.locator(".prompt-panel")).toBeHidden()
  await page.keyboard.press("z") // running -> stopped
  await expect(page.locator(".phase-strip")).toContainText("UNLOAD")
  await page.keyboard.press("z") // stopped -> unloaded
  await expect(page.locator(".status-strip")).toContainText("clean=1/3")

  // ---- beta: load → init surfaces mismatch → deny → rejected → unload ----
  await page.keyboard.press("Tab") // alpha(unloaded) -> beta
  await expect(page.locator(".phase-strip")).toContainText("TARGET: beta")
  await page.keyboard.press("z") // spawning -> loaded
  await page.keyboard.press("z") // loaded -> version-mismatch prompt
  await expect(page.locator(".prompt-panel")).toBeVisible()
  await expect(page.locator(".prompt-panel")).toContainText("VERSION MISMATCH")
  await page.keyboard.press("x") // reject at init
  await expect(page.locator(".phase-strip")).toContainText("unload")
  await page.keyboard.press("z") // rejected -> unloaded
  await expect(page.locator(".status-strip")).toContainText("clean=2/3")

  // ---- gamma: load → init → sandbox → start → (panic contained) → unload ----
  await page.keyboard.press("Tab") // beta(unloaded) -> gamma
  await expect(page.locator(".phase-strip")).toContainText("TARGET: gamma")
  await page.keyboard.press("z") // spawning -> loaded
  await page.keyboard.press("z") // loaded -> inited
  await page.keyboard.press("s") // sandbox on
  await page.keyboard.press("z") // inited -> running — panic fires at +1500 ms
  // The sandbox auto-contains the panic and transitions gamma to `stopped`.
  await expect(page.locator(".phase-strip")).toContainText("UNLOAD", { timeout: 6000 })
  await expect(page.locator(".status-strip")).toContainText("contained=1")
  await page.keyboard.press("z") // stopped -> unloaded
  await expect(page.locator(".status-strip")).toContainText("clean=3/3")

  // Wave clear + evidence emitted.
  await expect(page.locator(".phase-strip")).toContainText("WAVE CLEAR — PASS")
  await expect(evidenceLines.length).toBeGreaterThanOrEqual(1)

  const record = await page.evaluate(() => {
    const w = window as unknown as { __gameEvidence?: unknown }
    return w.__gameEvidence
  })
  expect(record).toBeTruthy()
  const evidence = record as Record<string, unknown>
  expect(evidence["schema"]).toBe("09_plugin_system-v1")
  expect(evidence["source"]).toBe("plugindoj")
  expect(evidence["unit_id"]).toBe("09_plugin_system")
  expect(evidence["project"]).toBe("09_plugin_system")
  expect(evidence["encounter_id"]).toBe("plugin-docking-bay-01")
  expect(evidence["game"]).toBe("Plugin Docking Bay")
  expect(evidence["pass"]).toBe(true)
  expect(Number.isNaN(Date.parse(String(evidence["ts"])))).toBe(false)

  const metrics = evidence["metrics"] as Record<string, unknown>
  expect(metrics["kind"]).toBe("threejs-plugin-lifecycle")
  expect(metrics["pods_loaded"]).toBe(3)
  expect(metrics["pods_started_sandboxed"]).toBe(2)
  expect(metrics["pods_started_unsandboxed"]).toBe(0)
  expect(metrics["undeclared_denied"]).toBe(1)
  expect(metrics["undeclared_leaked"]).toBe(0)
  expect(metrics["version_mismatches_total"]).toBe(1)
  expect(metrics["version_mismatches_handled"]).toBe(1)
  expect(metrics["invalid_transitions_attempted"]).toBe(0)
  expect(metrics["hooks_out_of_order"]).toBe(0)
  expect(metrics["panics_contained"]).toBe(1)
  expect(metrics["panics_vented"]).toBe(0)
  expect(metrics["host_damage"]).toBe(0)
  expect(metrics["plugins_unloaded_clean"]).toBe(3)

  const review = evidence["review_context"] as Record<string, unknown>
  expect(review["scheduled_review"]).toBe(false)
  expect(review["review_reason"]).toBe("deepening")
  expect(review["scheduler_source"]).toBe("learner-substrate")
  expect(review["verifier_required"]).toBe(true)

  // Persist the evidence to the NDJSON log (mirrors EVIDENCE_CONTRACT.md).
  mkdirSync(dirname(evidenceLogPath), { recursive: true })
  writeFileSync(evidenceLogPath, `${JSON.stringify(evidence)}\n`, "utf8")

  // Producer side-effect contract: never writes learner state.
  const sideEffects = await page.evaluate(() => ({
    learningStatePublished: "__pixelQuestLearningState" in window,
    localStorageKeys: Object.keys(localStorage),
  }))
  expect(sideEffects.learningStatePublished).toBe(false)
  expect(sideEffects.localStorageKeys).not.toContain("learning_state")
  expect(sideEffects.localStorageKeys).not.toContain("units_log")
  expect(sideEffects.localStorageKeys).not.toContain("mastered")

  await page.screenshot({ path: "shots/09_plugin_system.png", fullPage: true })
  expect(runtimeErrors).toEqual([])
})

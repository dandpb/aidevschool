import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

// Drives the Posting Lattice 3D scene to its win state under Playwright and
// captures the emitted EVIDENCE record. The wave is a fixed sequence of five
// query orbs over the 5-document corpus:
//   1. `cache`                → doc_a (has cache)             → MATCH (Z)
//   2. `"distributed cache"`  → doc_a (adjacent phrase)       → MATCH (Z)
//   3. `cache OR queue`       → doc_d (has neither) [TRAP]    → REJECT (X)
//   4. `cache AND queue`      → doc_e (has both)              → MATCH (Z)
//   5. `cache NOT queue`      → doc_e (NOT excludes) [TRAP]   → REJECT (X)
// After the fifth action the wave clears and the scene emits
// `EVIDENCE {...}` with pass:true.

const here = dirname(fileURLToPath(import.meta.url))
const evidenceLogPath = join(here, "..", ".logs", "evidence.ndjson")

test("plays the Posting Lattice wave to PASS and emits evidence", async ({ page }) => {
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

  // Confirm the scene shows the first query orb.
  await expect(page.locator(".orb-panel")).toContainText("query: cache")
  await expect(page.locator(".orb-panel")).toContainText("target: doc_a")

  // Drive the five orbs in order: Z Z X Z X.
  // Orb 1 — single-term MATCH (cache present in doc_a).
  await page.keyboard.press("z")
  await expect(page.locator(".orb-panel")).toContainText('query: "distributed cache"')
  await expect(page.locator(".orb-panel")).toContainText("target: doc_a")

  // Orb 2 — phrase MATCH (adjacent tokens in doc_a).
  await page.keyboard.press("z")
  await expect(page.locator(".orb-panel")).toContainText("query: cache OR queue")
  await expect(page.locator(".orb-panel")).toContainText("target: doc_d")

  // Orb 3 — OR trap: doc_d has neither cache nor queue; must REJECT.
  await page.keyboard.press("x")
  await expect(page.locator(".orb-panel")).toContainText("query: cache AND queue")
  await expect(page.locator(".orb-panel")).toContainText("target: doc_e")

  // Orb 4 — boolean AND MATCH (doc_e has both cache and queue).
  await page.keyboard.press("z")
  await expect(page.locator(".orb-panel")).toContainText("query: cache NOT queue")
  await expect(page.locator(".orb-panel")).toContainText("target: doc_e")

  // Orb 5 — NOT trap: doc_e has queue so `cache NOT queue` excludes it; REJECT.
  await page.keyboard.press("x")

  // Wave clear banner.
  await expect(page.locator(".result-banner")).toContainText("WAVE CLEAR", { timeout: 10_000 })
  await expect(page.locator(".result-banner")).toHaveAttribute("data-state", "pass")

  // Evidence record was published on the window channel.
  const record = await page.evaluate(() => window.__gameEvidence)
  expect(record).toBeTruthy()
  expect(record?.schema).toBe("18_search_engine-v1")
  expect(record?.source).toBe("postinglattice")
  expect(record?.unit_id).toBe("18_search_engine")
  expect(record?.project).toBe("18_search_engine")
  expect(record?.encounter_id).toBe("posting-lattice-01")
  expect(record?.game).toBe("Posting Lattice")
  expect(record?.pass).toBe(true)
  expect(record?.metrics?.kind).toBe("threejs-posting-lattice")
  expect(record?.metrics?.orbs_classified).toBe(5)
  expect(record?.metrics?.matches_correct).toBe(3)
  expect(record?.metrics?.matches_wrong).toBe(0)
  expect(record?.metrics?.rejects_correct).toBe(2)
  expect(record?.metrics?.rejects_wrong).toBe(0)
  expect(record?.metrics?.documents_indexed).toBe(5)
  expect(record?.metrics?.terms_indexed).toBeGreaterThan(0)
  expect(record?.metrics?.average_document_length).toBeGreaterThan(0)
  expect(record?.metrics?.bm25_top_score).toBeGreaterThan(0)
  expect(record?.metrics?.index_lookup_p95_ms).toBeGreaterThan(0)
  expect(record?.metrics?.parse_p95_ms).toBeGreaterThan(0)
  expect(record?.metrics?.index_lookup_p95_ms).toBeGreaterThan(record?.metrics?.parse_p95_ms ?? 0)
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

  await page.screenshot({ path: "shots/18_search_engine.png", fullPage: true })
  expect(runtimeErrors).toEqual([])
})

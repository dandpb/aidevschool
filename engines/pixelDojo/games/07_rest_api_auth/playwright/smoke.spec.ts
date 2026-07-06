import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

const here = dirname(fileURLToPath(import.meta.url))
const screenshotPath = join(here, "..", "shots", "07_rest_api_auth.png")
const outputDir = join(
  here,
  "..",
  "..",
  "..",
  "..",
  "..",
  ".loops",
  "threejs-dojo",
  "output",
  "07_rest_api_auth",
)

// Aegis Corridor smoke: compose the canonical middleware order
// (Version -> Validation -> AuthN -> AuthZ), open the portal, and watch the
// wave resolve with zero breaches. Asserts a single EVIDENCE console line and
// a valid evidence record with pass:true, then saves a screenshot.

test("composes the canonical middleware chain and clears the L1 wave", async ({ page }) => {
  const runtimeErrors: string[] = []
  const evidenceLines: string[] = []
  page.on("pageerror", (err) => runtimeErrors.push(err.message))
  page.on("console", (msg) => {
    const text = msg.text()
    if (text.startsWith("EVIDENCE ")) {
      evidenceLines.push(text.slice("EVIDENCE ".length))
    }
  })

  await page.goto("/")
  const canvas = page.locator("canvas")
  await expect(canvas).toBeVisible()
  await expect(page.getByText("AEGIS CORRIDOR")).toBeVisible()
  await expect(page.getByText("phase: COMPOSE")).toBeVisible()

  // Drive the dock with the keyboard to prove navigation works.
  await page.keyboard.press("ArrowRight")
  await expect(page.getByText(/Dock selected/)).toBeVisible()
  await page.keyboard.press("ArrowLeft")

  // Compose the canonical order via the same state-machine path the keyboard
  // uses. composeCanonical() resets the dock + slots and places all four
  // gates in canonical order, exercising placeSelected() four times.
  await page.evaluate(() => window.__aegisDebug?.composeCanonical())
  await expect(page.getByText("VERSION -> VALIDATION -> AUTHN -> AUTHZ -> HANDLER")).toBeVisible()
  await expect(
    page.getByText("All four gates placed — press SPACE to open the portal."),
  ).toBeVisible()

  // Open the portal.
  await page.evaluate(() => window.__aegisDebug?.openPortal())
  await expect(page.getByText("phase: RUNNING")).toBeVisible()

  // Wait for the wave to resolve and the EVIDENCE line to land. The wave is
  // ~8 orbs * 700ms spawn + ~4.2s transit = under 10s, but allow margin.
  await expect
    .poll(async () => page.evaluate(() => window.__aegisDebug?.getState().phase), {
      timeout: 30_000,
    })
    .toBe("resolved")

  // At least one EVIDENCE console line was emitted.
  expect(evidenceLines.length).toBeGreaterThanOrEqual(1)

  // Read the in-page channel and validate the record shape.
  const evidence = await page.evaluate(() => window.__gameEvidence)
  expect(evidence).toBeTruthy()
  expect(evidence?.schema).toBe("07_rest_api_auth-v1")
  expect(evidence?.source).toBe("aegis-corridor")
  expect(evidence?.unit_id).toBe("07_rest_api_auth")
  expect(evidence?.project).toBe("07_rest_api_auth")
  expect(evidence?.encounter_id).toBe("encounter-aegis-corridor-01")
  expect(evidence?.game).toBe("Aegis Corridor")
  expect(evidence?.pass).toBe(true)
  expect(evidence?.mechanic).toContain("Aegis Corridor")
  expect(evidence?.concept).toContain("middleware")
  expect(Number.isNaN(Date.parse(evidence?.ts ?? ""))).toBe(false)
  expect(evidence?.gates.length).toBeGreaterThan(0)

  const metrics = evidence?.metrics
  expect(metrics?.kind).toBe("threejs-middleware-chain")
  expect(metrics?.correct_order).toBe(true)
  expect(metrics?.gate_order).toEqual(["version", "validation", "authn", "authz"])
  expect(metrics?.forged_admitted).toBe(0)
  expect(metrics?.expired_admitted).toBe(0)
  expect(metrics?.wrong_audience_admitted).toBe(0)
  expect(metrics?.missing_token_admitted).toBe(0)
  expect(metrics?.forbidden_reached_handler).toBe(0)
  expect(metrics?.malformed_admitted).toBe(0)
  expect(metrics?.wrong_version_admitted).toBe(0)
  expect(metrics?.legit_admitted).toBe(2)
  expect(metrics?.legit_rejected).toBe(0)
  expect(metrics?.overheated).toBe(false)

  // Side-effect contract: this is a sibling game; it never publishes
  // pixel-quest's learning state and never touches localStorage.
  const sideEffects = await page.evaluate(() => ({
    pixelQuestLearningStatePublished: "__pixelQuestLearningState" in window,
    localStorageKeys: Object.keys(localStorage),
  }))
  expect(sideEffects.pixelQuestLearningStatePublished).toBe(false)
  expect(sideEffects.localStorageKeys).not.toContain("learning_state")
  expect(sideEffects.localStorageKeys).not.toContain("units_log")
  expect(sideEffects.localStorageKeys).not.toContain("mastered")

  // WAVE CLEAR banner.
  await expect(page.getByText(/WAVE CLEAR/)).toBeVisible()

  // Screenshot + persist artifacts.
  const canvasPixels = await canvas.evaluate((el) => {
    const c = el as HTMLCanvasElement
    return c.toDataURL("image/png").length
  })
  expect(canvasPixels).toBeGreaterThan(1000)

  await page.screenshot({ path: screenshotPath, fullPage: true })
  mkdirSync(outputDir, { recursive: true })
  const evidenceOut = join(outputDir, "evidence.json")
  const shotOut = join(outputDir, "screenshot.png")
  writeFileSync(evidenceOut, JSON.stringify(evidence, null, 2), "utf8")
  // Copy the screenshot next to the evidence.json for the loop output.
  if (existsSync(screenshotPath)) {
    const buf = readFileSync(screenshotPath)
    writeFileSync(shotOut, buf)
  }

  expect(runtimeErrors).toEqual([])
})

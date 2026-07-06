import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

// Drive the Slug Launcher to a winning wave (HASH strategy on duplicate
// URLs forces collisions; R retries with salt until each crate docks).
// Captures the emitted EVIDENCE record + screenshot, then asserts the
// producer≠verifier side-effect contract (no learner state touched).

const here = dirname(fileURLToPath(import.meta.url))
const evidencePath = join(here, "..", ".logs", "evidence.ndjson")

test("plays the Slug Launcher wave and emits pass evidence", async ({ page }) => {
  const runtimeErrors: string[] = []
  const evidenceLines: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text())
    const text = message.text()
    if (text.startsWith("EVIDENCE ")) evidenceLines.push(text)
  })

  await page.goto("/")

  // Canvas must mount and HUD must show.
  await expect(page.locator("canvas")).toBeVisible()
  await expect(page.locator(".hud")).toBeVisible()
  await expect(page.locator('[data-name="strategy"]')).toContainText("HASH")

  // Lock strategy to HASH (default) so duplicate URLs collide predictably.
  await page.keyboard.press("2")
  await expect(page.locator('[data-name="strategy"]')).toContainText("HASH")

  // Start the wave.
  await page.keyboard.press("Space")

  // Drive the wave to completion. The wave is 4 crates with 2 duplicate-URL
  // pairs, so under HASH we expect exactly 2 collisions, each recovered via
  // a single retry. Cap the loop to avoid infinite spins on a regression.
  for (let step = 0; step < 60; step += 1) {
    const status = await getStatus(page)
    if (status === "wave-clear" || status === "wave-fail") break
    if (status === "live") {
      await page.keyboard.press("Space")
      await page.waitForTimeout(120)
      continue
    }
    if (status === "collision") {
      // Retry until the crate docks or retries exhaust. The wave config
      // makes one retry sufficient on average, but loop to be robust.
      for (let r = 0; r < 8; r += 1) {
        const before = await getStatus(page)
        if (before !== "collision") break
        await page.keyboard.press("r")
        await page.waitForTimeout(80)
      }
      await page.waitForTimeout(120)
      continue
    }
    // flying / between / spawning / intro: wait for the next state.
    await page.waitForTimeout(120)
  }

  // Wave should have cleared and emitted exactly one EVIDENCE line.
  const finalStatus = await getStatus(page)
  expect(finalStatus, `wave should clear; got status=${finalStatus}`).toBe("wave-clear")
  expect(evidenceLines.length, "exactly one EVIDENCE line on pass").toBe(1)

  // Inspect the in-page record (authoritative channel).
  const evidence = await page.evaluate(() => window.__gameEvidence)
  expect(evidence).toBeTruthy()
  expect(evidence?.schema).toBe("03_url_shortener-v1")
  expect(evidence?.source).toBe("threejs-dojo")
  expect(evidence?.unit_id).toBe("03_url_shortener")
  expect(evidence?.project).toBe("03_url_shortener")
  expect(evidence?.encounter_id).toBe("slug-launcher-01")
  expect(evidence?.game).toBe("Slug Launcher")
  expect(evidence?.pass).toBe(true)
  expect(Number.isNaN(Date.parse(evidence?.ts ?? ""))).toBe(false)

  const metrics = evidence?.metrics
  expect(metrics?.kind).toBe("threejs-slug-launcher")
  expect(metrics?.codes_assigned).toBeGreaterThanOrEqual(4)
  expect(metrics?.codes_assigned).toBe(metrics?.wave_target)
  expect(metrics?.collisions_detected).toBeGreaterThanOrEqual(1)
  expect(metrics?.collisions_retried_ok).toBe(metrics?.collisions_detected)
  expect(metrics?.retries_exhausted).toBe(0)
  expect(metrics?.dock_overflows).toBe(0)
  expect(metrics?.wave_cleared).toBe(true)
  expect(metrics?.strategies_used).toContain("hash")

  expect(evidence?.curriculum_context).toMatchObject({
    mechanic: "Slug Launcher (3D hash cannon + base62 docks)",
  })

  // Persist the captured record to the durable NDJSON channel.
  mkdirSync(dirname(evidencePath), { recursive: true })
  writeFileSync(evidencePath, `${evidenceLines.join("\n")}\n`, "utf8")

  // Producer ≠ verifier: the game must NOT touch learner state.
  const sideEffects = await page.evaluate(() => ({
    learningStatePublished:
      "__pixelQuestLearningState" in window || "__gameLearningState" in window,
    localStorageKeys: Object.keys(localStorage),
  }))
  expect(sideEffects.learningStatePublished).toBe(false)
  expect(sideEffects.localStorageKeys).not.toContain("learning_state")
  expect(sideEffects.localStorageKeys).not.toContain("units_log")
  expect(sideEffects.localStorageKeys).not.toContain("mastered")

  await page.screenshot({
    path: "shots/03_url_shortener.png",
    fullPage: true,
  })

  // No uncaught runtime errors.
  expect(runtimeErrors).toEqual([])
})

async function getStatus(page: import("@playwright/test").Page): Promise<string> {
  return page.evaluate(() => window.__slugLauncherDebug?.getStatus() ?? "unknown")
}

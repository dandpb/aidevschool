// Ad-hoc capture: drive the lab, dump window.__pixelQuestEvidence after the duel.
// Run with: pnpm exec playwright test --config=/dev/null (this is a one-off script).
// Simpler: spawn the dev server, drive with the test framework's chromium directly.

import { chromium } from "@playwright/test"
import { writeFileSync } from "node:fs"

const BASE = process.env.PIXEL_QUEST_URL ?? "http://127.0.0.1:5173"

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  const consoleLines = []
  page.on("console", (msg) => {
    consoleLines.push({ type: msg.type(), text: msg.text() })
  })

  await page.goto(BASE)
  await page.locator("canvas").waitFor()

  // Walk the same path as playwright/pixel-quest.spec.ts for project 01.
  await page.getByRole("button", { name: "Orbita 3D" }).click()
  await page.keyboard.press("ArrowRight") // back from lab 02 -> lab 01
  await page.getByRole("button", { name: "Abrir lab" }).click()
  await page.locator("canvas").click()
  await page.keyboard.press("e")
  await page.getByRole("button", { name: "Abrir treino" }).click()
  await page.keyboard.press("Enter")
  await page.keyboard.press("Enter") // briefing -> treino -> duelo

  for (const action of ["z", "x", "z", "x", "z", "x", "z", "x", "z", "x"]) {
    await page.keyboard.press(action)
  }

  await page.getByText("Evidencia PASS emitida").waitFor()

  const evidence = await page.evaluate(() => window.__pixelQuestEvidence)

  const evidenceLines = consoleLines.filter((l) => l.text.startsWith("EVIDENCE "))

  writeFileSync(
    process.argv[2] ?? "evidence.json",
    JSON.stringify(
      {
        evidence,
        console_evidence_lines: evidenceLines,
        captured_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  )

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

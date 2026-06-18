import { expect, test } from "@playwright/test"

test("plays the PixelDojo Quest token bucket slice and emits evidence", async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text())
    }
  })

  await page.goto("/")
  const canvas = page.locator("canvas")
  await expect(canvas).toBeVisible()
  await expect(page.locator(".objective-chip")).toContainText("SONDA")

  const dataUrlLength = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement
    return canvasElement.toDataURL("image/png").length
  })
  expect(dataUrlLength).toBeGreaterThan(1000)

  await canvas.click()
  await page.keyboard.press("e")
  await expect(page.getByRole("button", { name: "Iniciar duelo" })).toBeVisible()
  await page.keyboard.press("Enter")

  const actions = ["z", "z", "x", "z", "z", "x", "z", "z", "x", "z", "z", "x"]
  for (const action of actions) {
    await page.keyboard.press(action)
  }

  await expect(page.getByText("Evidencia PASS emitida")).toBeVisible()
  const evidence = await page.evaluate(() => window.__pixelQuestEvidence)
  expect(evidence?.unit_id).toBe("U0-sonda-rate-limiter-robustness")
  expect(evidence?.pass).toBe(true)
  expect(evidence?.metrics.abusive_admitted).toBe(0)

  await page.screenshot({ path: "shots/pixel-quest-smoke.png", fullPage: true })
  expect(runtimeErrors).toEqual([])
})

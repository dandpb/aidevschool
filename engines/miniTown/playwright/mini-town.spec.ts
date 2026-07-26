import { expect, test } from "@playwright/test"

test("loads the town and advances its public simulation", async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text())
  })
  page.on("pageerror", (error) => runtimeErrors.push(error.message))

  await page.goto("/")

  await expect(page).toHaveTitle("MiniTown — Engine Skeleton")
  await expect(page.locator("canvas")).toBeVisible()
  await expect(page.locator("#hud-stub")).toContainText("MiniTown —")

  const simulation = await page.evaluate(() => {
    const town = window.__miniTown
    if (!town) throw new Error("MiniTown test hook was not installed")
    const before = town.getSnapshot().simTime
    const after = town.controller.step(1).simTime
    return { before, after, sceneChildren: town.scene.children.length }
  })

  expect(simulation.after).toBeGreaterThan(simulation.before)
  expect(simulation.sceneChildren).toBeGreaterThan(0)
  expect(runtimeErrors).toEqual([])
})

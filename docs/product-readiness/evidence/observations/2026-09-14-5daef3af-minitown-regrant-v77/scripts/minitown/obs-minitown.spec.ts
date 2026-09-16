import { mkdirSync, writeFileSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"

// QA Lead AID-1954 — walk de observação independente minitown-explore-only
// (cenário docs/product-readiness/scenarios/minitown-explore-only.yaml),
// distinto da run de producer (playwright/mini-town.spec.ts).
// Passos do cenário: launch-local-route → observe-town-simulation →
// confirm-explore-only-boundary → exit-without-learner-write.

const evDir = process.env.QA_EV_DIR ?? "."
const logPath = process.env.QA_WALK_LOG ?? "walk-log-minitown.json"
const startedAt = new Date().toISOString()

interface Step1 {
  step: "launch-local-route"
  titleOk: boolean
  canvasVisible: boolean
  hudMounted: boolean
}
interface Step2 {
  step: "observe-town-simulation"
  simAdvances: boolean
  sceneChildren: number
  hudSimTimeAdvances: boolean
  runtimeErrors: string[]
}
interface Step3 {
  step: "confirm-explore-only-boundary"
  localStorageEntries: number
  sessionStorageEntries: number
  storageWritesByApp: boolean
  masteryOrCompletionCopy: boolean
}
interface Step4 {
  step: "exit-without-learner-write"
  simTimeResetAfterReload: boolean
  storageStillEmpty: boolean
}

async function collectRuntimeErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __qaRuntimeErrors?: string[] }).__qaRuntimeErrors ?? [])
}

test("qa walk: minitown-explore-only @ 5daef3af (PR #432, AID-1954)", async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text())
  })
  page.on("pageerror", (error) => runtimeErrors.push(error.message))

  // 1. launch-local-route
  await page.goto("/")
  await expect(page).toHaveTitle("MiniTown — Engine Skeleton")
  const canvas = page.locator("canvas")
  await expect(canvas).toBeVisible()
  const hud = page.locator("#hud-stub")
  await expect(hud).toContainText("MiniTown —")
  const step1: Step1 = {
    step: "launch-local-route",
    titleOk: true,
    canvasVisible: true,
    hudMounted: true,
  }
  await page.screenshot({ path: `${evDir}/qamt77-01-explore.png` })

  // 2. observe-town-simulation — HUD avança em tempo real (clock do jogo)
  const hudBefore = await hud.innerText()
  await page.waitForFunction(
    () => {
      const el = document.querySelector("#hud-stub")
      return el !== null && el.textContent !== null && /simTime=\d+\.\d+h/.test(el.textContent)
    },
    { timeout: 30_000 },
  )
  await expect
    .poll(async () => hud.innerText(), { timeout: 30_000 })
    .not.toBe(hudBefore)
  const simulation = await page.evaluate(() => {
    const town = window.__miniTown
    if (!town) throw new Error("MiniTown test hook was not installed")
    const before = town.getSnapshot().simTime
    const after = town.controller.step(1).simTime
    return { before, after, sceneChildren: town.scene.children.length }
  })
  expect(simulation.after).toBeGreaterThan(simulation.before)
  expect(simulation.sceneChildren).toBeGreaterThan(0)
  const step2: Step2 = {
    step: "observe-town-simulation",
    simAdvances: simulation.after > simulation.before,
    sceneChildren: simulation.sceneChildren,
    hudSimTimeAdvances: true,
    runtimeErrors: [],
  }

  // 3. confirm-explore-only-boundary — sem escrita de aprendiz, sem copy de conclusão
  const boundary = await page.evaluate(() => {
    const masteryPattern = /(mastered|mastery|conclu[ií]da|completed|certificad|verified|progresso salvo|progress saved)/i
    const texts = Array.from(document.querySelectorAll("body *"))
      .map((el) => el.textContent ?? "")
      .filter((t) => t.trim().length > 0)
    return {
      localStorageEntries: window.localStorage.length,
      sessionStorageEntries: window.sessionStorage.length,
      storageWritesByApp: window.localStorage.length > 0 || window.sessionStorage.length > 0,
      masteryOrCompletionCopy: texts.some((t) => masteryPattern.test(t)),
    }
  })
  expect(boundary.storageWritesByApp).toBe(false)
  expect(boundary.masteryOrCompletionCopy).toBe(false)
  const step3: Step3 = {
    step: "confirm-explore-only-boundary",
    localStorageEntries: boundary.localStorageEntries,
    sessionStorageEntries: boundary.sessionStorageEntries,
    storageWritesByApp: boundary.storageWritesByApp,
    masteryOrCompletionCopy: boundary.masteryOrCompletionCopy,
  }

  // 4. exit-without-learner-write — reload restaura o mundo do zero
  const simTimeBeforeReload = await page.evaluate(() => window.__miniTown.getSnapshot().simTime)
  await page.reload()
  await expect(canvas).toBeVisible()
  await expect(hud).toBeVisible()
  const afterReload = await page.evaluate(() => ({
    simTime: window.__miniTown.getSnapshot().simTime,
    localStorage: window.localStorage.length,
    sessionStorage: window.sessionStorage.length,
  }))
  expect(afterReload.simTime).toBeLessThan(simTimeBeforeReload)
  expect(afterReload.localStorage + afterReload.sessionStorage).toBe(0)
  const step4: Step4 = {
    step: "exit-without-learner-write",
    simTimeResetAfterReload: afterReload.simTime < simTimeBeforeReload,
    storageStillEmpty: afterReload.localStorage + afterReload.sessionStorage === 0,
  }
  await page.screenshot({ path: `${evDir}/qamt77-02-returning-reload.png` })

  step2.runtimeErrors = [...runtimeErrors, ...(await collectRuntimeErrors(page))]
  expect(step2.runtimeErrors).toEqual([])

  const log = {
    surface: "miniTown",
    gitPin: "5daef3af",
    startedAt,
    steps: [step1, step2, step3, step4],
    verdict: {
      townRendersAndAdvances:
        step1.titleOk && step1.canvasVisible && step2.simAdvances && step2.hudSimTimeAdvances && step2.runtimeErrors.length === 0,
      exploreOnlyBoundaryHeld: !step3.storageWritesByApp && !step3.masteryOrCompletionCopy,
      noLearnerWrite: step4.simTimeResetAfterReload && step4.storageStillEmpty,
    },
  }
  mkdirSync(evDir, { recursive: true })
  writeFileSync(logPath, `${JSON.stringify(log, null, 2)}\n`, "utf8")
  expect(Object.values(log.verdict).every(Boolean)).toBe(true)
})

import { expect, test } from "@playwright/test"
import { reviewSlice } from "../src/content/reviewSlice"

const firstUnitId = "U0-sonda-rate-limiter-robustness"
const firstUnitScheduledReview = reviewSlice.nextReviews[0]?.unitId === firstUnitId

test("plays the PixelDojo curriculum quest slice and advances labs", async ({ page }) => {
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
  await expect(page.locator(".objective-chip")).toContainText("PixelDojo Quest")
  await expect(page.locator(".phase-strip")).toContainText("Briefing")
  await expect(page.locator(".objective-chip")).toContainText("18 labs")
  await page.getByRole("button", { name: "Orbita 3D" }).click()
  await expect(page.locator(".objective-chip")).toContainText("Orbita 3D")
  await expect(page.locator(".phase-strip")).toContainText("Orbita 3D")
  await expect(page.getByText("Duelo 1: Agent Quest: Rate Limiter")).toBeVisible()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByText("Duelo 2: Key Value Store")).toBeVisible()
  await expect(page.getByRole("button", { name: "Lab bloqueado" })).toBeDisabled()
  await page.keyboard.press("ArrowLeft")
  await expect(page.getByText("Duelo 1: Agent Quest: Rate Limiter")).toBeVisible()
  await page.screenshot({ path: "shots/pixel-quest-skill-orbit-desktop.png", fullPage: true })

  const dataUrlLength = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement
    return canvasElement.toDataURL("image/png").length
  })
  expect(dataUrlLength).toBeGreaterThan(1000)

  await page.getByRole("button", { name: "Abrir lab" }).click()
  await canvas.click()
  await expect(page.locator(".objective-chip")).toContainText("Rate Limiter")
  await expect(page.locator(".phase-strip")).toContainText("Mapa")
  await page.keyboard.press("e")
  await expect(page.getByRole("button", { name: "Abrir treino" })).toBeVisible()
  await page.keyboard.press("Enter")
  await expect(page.getByText("Simulacao de orquestracao")).toBeVisible()
  await expect(page.getByText(/Sonda, Mestre-Conteudo e Prometor/)).toBeVisible()
  await expect(page.locator(".phase-strip")).toContainText("Treino")
  await expect(page.locator(".prompt-chip")).toContainText("Z Acionar")
  await expect(page.locator(".prompt-chip")).toContainText("X Bloquear")
  await page.keyboard.press("Enter")
  await expect(page.locator(".phase-strip")).toContainText("Duelo")

  const actions = ["z", "x", "z", "x", "z", "x", "z", "x", "z", "x"]
  for (const action of actions) {
    await page.keyboard.press(action)
  }

  await expect(page.getByText("Evidencia PASS emitida")).toBeVisible()
  await expect(page.locator(".phase-strip")).toContainText("Evidencia")
  const evidence = await page.evaluate(() => window.__pixelQuestEvidence)
  expect(evidence?.unit_id).toBe(firstUnitId)
  expect(evidence?.project).toBe("01_rate_limiter")
  expect(evidence?.encounter_id).toBe("encounter-agent-quest-01")
  expect(evidence?.pass).toBe(true)
  expect(evidence?.metrics.good_admits).toBe(5)
  expect(evidence?.metrics.abusive_admitted).toBe(0)
  expect(evidence?.curriculum_context).toMatchObject({
    mechanic: "Agent Quest",
    accepted_signal: "acao agentica correta",
    rejected_trap: "atalho sem evidencia",
  })
  expect(evidence?.review_context).toMatchObject({
    scheduled_review: firstUnitScheduledReview,
    streak_candidate: true,
    scheduler_source: "learner-substrate",
    verifier_required: true,
  })
  await expect(page.getByText("O verificador decide mastery")).toBeVisible()

  await page.getByRole("button", { name: "Voltar ao mapa" }).click()
  await expect(page.locator(".status-strip")).toContainText("Evidencia PASS")
  if (firstUnitScheduledReview) {
    await expect(page.locator(".status-strip")).toContainText("+1 pending")
  } else {
    await expect(page.locator(".status-strip")).not.toContainText("+1 pending")
  }
  await page.keyboard.press("j")
  await expect(page.getByText("Ultima evidencia: PASS")).toBeVisible()
  if (firstUnitScheduledReview) {
    await expect(page.getByText("gate pending")).toBeVisible()
  }
  await expect(page.locator(".phase-strip")).toContainText("Revisao")

  await page.getByRole("button", { name: "Fechar" }).click()
  for (let step = 0; step < 7; step += 1) {
    await page.keyboard.press("ArrowRight")
  }
  for (let step = 0; step < 6; step += 1) {
    await page.keyboard.press("ArrowUp")
  }
  await page.keyboard.press("e")
  await expect(page.locator(".objective-chip")).toContainText("Key Value Store")
  await expect(page.locator(".phase-strip")).toContainText("Mapa")
  await page.keyboard.press("e")
  await page.keyboard.press("Enter")
  await expect(page.getByText("Treino de TTL")).toBeVisible()
  await expect(page.locator(".prompt-chip")).toContainText("Z Servir")
  await expect(page.locator(".prompt-chip")).toContainText("X Invalidar")
  await page.keyboard.press("Enter")
  await expect(page.locator(".objective-chip")).toContainText("TTL Cache")
  for (const action of ["z", "z", "x", "z", "x"]) {
    await page.keyboard.press(action)
  }
  await expect(page.getByText("Evidencia PASS emitida")).toBeVisible()
  const sequenceEvidence = await page.evaluate(() => window.__pixelQuestEvidence)
  expect(sequenceEvidence?.project).toBe("02_key_value_store")
  expect(sequenceEvidence?.pass).toBe(true)
  expect(sequenceEvidence?.curriculum_context).toMatchObject({
    mechanic: "TTL Cache",
    accepted_signal: "chave quente valida",
    rejected_trap: "leitura expirada",
  })

  await page.evaluate(() => window.__pixelQuestDebug?.enterRegion("lab-07_rest_api_auth"))
  await expect(page.locator(".objective-chip")).toContainText("REST API Auth")
  await page.keyboard.press("e")
  await page.keyboard.press("Enter")
  await expect(page.getByText("Treino de autorizacao")).toBeVisible()
  await page.keyboard.press("Enter")
  await expect(page.locator(".objective-chip")).toContainText("Auth Gate")
  for (const action of ["z", "x", "z", "x", "x", "z"]) {
    await page.keyboard.press(action)
  }
  await expect(page.getByText("Evidencia PASS emitida")).toBeVisible()
  const policyEvidence = await page.evaluate(() => window.__pixelQuestEvidence)
  expect(policyEvidence?.project).toBe("07_rest_api_auth")
  expect(policyEvidence?.pass).toBe(true)
  expect(policyEvidence?.curriculum_context).toMatchObject({
    mechanic: "Auth Gate",
    accepted_signal: "token autorizado",
    rejected_trap: "escopo invalido",
  })

  await page.evaluate(() => window.__pixelQuestDebug?.enterRegion("lab-11_load_balancer"))
  await expect(page.locator(".objective-chip")).toContainText("Load Balancer")
  await page.keyboard.press("e")
  await page.keyboard.press("Enter")
  await expect(page.getByText("Treino de health check")).toBeVisible()
  await page.keyboard.press("Enter")
  await expect(page.locator(".objective-chip")).toContainText("Health Router")
  for (const action of ["z", "x", "z", "x", "z"]) {
    await page.keyboard.press(action)
  }
  await expect(page.getByText("Evidencia PASS emitida")).toBeVisible()
  const routeEvidence = await page.evaluate(() => window.__pixelQuestEvidence)
  expect(routeEvidence?.project).toBe("11_load_balancer")
  expect(routeEvidence?.pass).toBe(true)
  expect(routeEvidence?.curriculum_context).toMatchObject({
    mechanic: "Health Router",
    accepted_signal: "no saudavel",
    rejected_trap: "no degradado",
  })

  const learningGateSideEffects = await page.evaluate(() => ({
    learningStatePublished: "__pixelQuestLearningState" in window,
    localStorageKeys: Object.keys(localStorage),
  }))
  expect(learningGateSideEffects.learningStatePublished).toBe(false)
  expect(learningGateSideEffects.localStorageKeys).not.toContain("learning_state")
  expect(learningGateSideEffects.localStorageKeys).not.toContain("units_log")
  expect(learningGateSideEffects.localStorageKeys).not.toContain("mastered")

  await page.screenshot({ path: "shots/pixel-quest-smoke.png", fullPage: true })
  expect(runtimeErrors).toEqual([])
})

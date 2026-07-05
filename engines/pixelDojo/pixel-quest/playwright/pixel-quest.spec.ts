import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"
import { reviewSlice } from "../src/content/reviewSlice"

const firstUnitId = "U0-sonda-rate-limiter-robustness"
const firstUnitScheduledReview = reviewSlice.nextReviews[0]?.unitId === firstUnitId
// Durable evidence channel for engines/pixelDojo/verifier: one JSON object per
// line, schema in ../src/game/evidence/emitter.ts and ../../EVIDENCE_CONTRACT.md.
const evidenceLogPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".logs",
  "evidence.ndjson",
)

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
  const evidence = await page.evaluate(() => window.__pixelQuestEvidence?.at(-1))
  expect(evidence?.unit_id).toBe(firstUnitId)
  expect(evidence?.project).toBe("01_rate_limiter")
  expect(evidence?.encounter_id).toBe("encounter-agent-quest-01")
  expect(evidence?.pass).toBe(true)
  const metrics = evidence?.metrics
  expect(metrics?.kind).toBe("pixelquest-sequence-flow")
  if (metrics?.kind === "pixelquest-sequence-flow") {
    expect(metrics.advanced).toBe(5)
    expect(metrics.guards_missed).toBe(0)
  }
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
  const sequenceEvidence = await page.evaluate(() => window.__pixelQuestEvidence?.at(-1))
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
  const authMode = await page.evaluate(() => window.__pixelQuestDebug?.getMode())
  expect(authMode).toBe("auth-gate")
  await expect(page.locator(".objective-chip")).toContainText("Auth Gate")
  for (const action of ["z", "x", "z", "x", "x", "z"]) {
    await page.keyboard.press(action)
  }
  await expect(page.getByText("Evidencia PASS emitida")).toBeVisible()
  const policyEvidence = await page.evaluate(() => window.__pixelQuestEvidence?.at(-1))
  expect(policyEvidence?.project).toBe("07_rest_api_auth")
  expect(policyEvidence?.pass).toBe(true)
  const policyMetrics = policyEvidence?.metrics
  expect(policyMetrics?.kind).toBe("pixelquest-policy-gate")
  if (policyMetrics?.kind === "pixelquest-policy-gate") {
    expect(policyMetrics.allowed).toBe(3)
    expect(policyMetrics.policy_leaks).toBe(0)
  }
  expect(policyEvidence?.curriculum_context).toMatchObject({
    mechanic: "Auth Gate",
    accepted_signal: "token autorizado",
    rejected_trap: "escopo invalido",
  })
  await page.screenshot({ path: "shots/pixel-quest-auth-gate-3d.png", fullPage: true })

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
  const routeEvidence = await page.evaluate(() => window.__pixelQuestEvidence?.at(-1))
  expect(routeEvidence?.project).toBe("11_load_balancer")
  expect(routeEvidence?.pass).toBe(true)
  expect(routeEvidence?.curriculum_context).toMatchObject({
    mechanic: "Health Router",
    accepted_signal: "no saudavel",
    rejected_trap: "no degradado",
  })

  // Lab 13 — Circuit Breaker (route_health) projects through the 3D
  // CircuitBreakerScene (mode "circuit-breaker") instead of the 2.5D world.
  // Validates that the 3D scene emits the same route-health evidence shape
  // and the gate anti-mastery contract still holds.
  await page.evaluate(() =>
    window.__pixelQuestDebug?.enterRegion("lab-13_api_gateway_circuit_breaker"),
  )
  await expect(page.locator(".objective-chip")).toContainText("Circuit Breaker")
  await page.keyboard.press("e")
  await page.keyboard.press("Enter")
  await expect(page.getByText("Treino de resiliencia")).toBeVisible()
  await page.keyboard.press("Enter")
  const cbMode = await page.evaluate(() => window.__pixelQuestDebug?.getMode())
  expect(cbMode).toBe("circuit-breaker")
  await expect(page.locator(".objective-chip")).toContainText("Circuit Breaker")
  for (const action of ["z", "x", "z", "x", "z"]) {
    await page.keyboard.press(action)
  }
  await expect(page.getByText("Evidencia PASS emitida")).toBeVisible()
  const cbEvidence = await page.evaluate(() => window.__pixelQuestEvidence?.at(-1))
  expect(cbEvidence?.project).toBe("13_api_gateway_circuit_breaker")
  expect(cbEvidence?.pass).toBe(true)
  const cbMetrics = cbEvidence?.metrics
  expect(cbMetrics?.kind).toBe("pixelquest-route-health")
  if (cbMetrics?.kind === "pixelquest-route-health") {
    expect(cbMetrics.routed).toBe(3)
    expect(cbMetrics.bad_routes).toBe(0)
  }
  expect(cbEvidence?.curriculum_context).toMatchObject({
    mechanic: "Circuit Breaker",
    accepted_signal: "upstream saudavel",
    rejected_trap: "falha em cascata",
  })
  await page.screenshot({ path: "shots/pixel-quest-circuit-breaker-3d.png", fullPage: true })

  // Persist the full append-only evidence channel as NDJSON — the contract
  // input consumed by engines/pixelDojo/verifier.
  const evidenceLog = await page.evaluate(() => window.__pixelQuestEvidence ?? [])
  expect(evidenceLog).toHaveLength(5)
  for (const record of evidenceLog) {
    expect(record.source).toBe("pixelquest")
    expect(record.unit_id).not.toBe("")
    expect(Number.isNaN(Date.parse(record.ts))).toBe(false)
  }
  mkdirSync(dirname(evidenceLogPath), { recursive: true })
  writeFileSync(
    evidenceLogPath,
    `${evidenceLog.map((record) => JSON.stringify(record)).join("\n")}\n`,
    "utf8",
  )

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

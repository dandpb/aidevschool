import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"
import { reviewSlice } from "../src/content/reviewSlice"

const firstUnitId = "U0-sonda-rate-limiter-robustness"
const firstUnitScheduledReview = reviewSlice.nextReviews[0]?.unitId === firstUnitId
// Durable evidence channel for learner/gate: one JSON object per
// line, schema in ../src/game/evidence/emitter.ts and ../../EVIDENCE_CONTRACT.md.
const evidenceLogPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".logs",
  "evidence.ndjson",
)

test("plays the PixelDojo curriculum quest slice and advances labs", async ({ page }) => {
  const runtimeErrors: string[] = []
  // Capture every `EVIDENCE <json>` console line the game emits (the durable
  // stdout channel scraped by harnesses; mirrors window.__pixelQuestEvidence).
  const evidenceConsoleLines: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text())
    }
    if (message.type() === "log" && message.text().startsWith("EVIDENCE ")) {
      evidenceConsoleLines.push(message.text())
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
  await expect(page.getByText("Duelo 1: Rate Limiter")).toBeVisible()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByText("Duelo 2: Key Value Store")).toBeVisible()
  await expect(page.getByRole("button", { name: "Lab bloqueado" })).toBeDisabled()
  await page.keyboard.press("ArrowLeft")
  await expect(page.getByText("Duelo 1: Rate Limiter")).toBeVisible()
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
  await expect(page.getByText("Treino de token bucket")).toBeVisible()
  await expect(page.locator(".phase-strip")).toContainText("Treino")
  await expect(page.locator(".prompt-chip")).toContainText("Z Admitir")
  await expect(page.locator(".prompt-chip")).toContainText("X Rejeitar")
  await page.keyboard.press("Enter")
  await expect(page.locator(".phase-strip")).toContainText("Duelo")

  // Lab 01 — Rate Limiter (token_bucket): capacity vs refill is the primary
  // playable surface. Admit (z) every legit request under the refill budget;
  // reject (x) every abusive burst so none slips through. 12 requests
  // alternate per the encounterTimeline (legit, legit, abuse, ...).
  const rateLimiterActions = ["z", "z", "x", "z", "z", "x", "z", "z", "x", "z", "z", "x"]
  for (const action of rateLimiterActions) {
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
  expect(metrics?.kind).toBe("pixelquest-token-bucket")
  if (metrics?.kind === "pixelquest-token-bucket") {
    expect(metrics.good_admits).toBe(8)
    expect(metrics.abusive_admitted).toBe(0)
    expect(metrics.abusive_rejected).toBe(4)
    expect(metrics.overheated).toBe(false)
  }
  expect(evidence?.curriculum_context).toMatchObject({
    mechanic: "Token Bucket",
    accepted_signal: "requisicao legitima",
    rejected_trap: "rajada abusiva",
  })
  expect(evidence?.review_context).toMatchObject({
    scheduled_review: firstUnitScheduledReview,
    streak_candidate: true,
    scheduler_source: "learner-substrate",
    verifier_required: true,
  })
  await expect(page.getByText("O verificador decide mastery")).toBeVisible()
  await page.screenshot({ path: "shots/pixel-quest-token-bucket.png", fullPage: true })

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

  // Lab 04 — Concurrent Task Queue (task_queue): the playable mechanic teaches
  // retry / backpressure / dead-letter-queue ordering. Process every legit job
  // (admit) and dead-letter every poison job (reject) to emit a passing
  // pixelquest-task-queue evidence record for U-04_concurrent_task_queue.
  await page.evaluate(() => window.__pixelQuestDebug?.enterRegion("lab-04_concurrent_task_queue"))
  await expect(page.locator(".objective-chip")).toContainText("Concurrent Task Queue")
  await page.keyboard.press("e")
  await page.keyboard.press("Enter")
  await expect(page.getByText("Treino de backpressure")).toBeVisible()
  await page.keyboard.press("Enter")
  const taskQueueMode = await page.evaluate(() => window.__pixelQuestDebug?.getMode())
  expect(taskQueueMode).toBe("encounter")
  await expect(page.locator(".objective-chip")).toContainText("Worker Queue")
  await expect(page.locator(".prompt-chip")).toContainText("Z Processar")
  await expect(page.locator(".prompt-chip")).toContainText("X Dead-letter")
  // 13 jobs in arrival order: legit, legit, poison, legit, legit, legit, poison,
  // legit, legit, legit, poison, legit, legit. Correct dispatch: admit (z) on
  // legit -> processed; reject (x) on poison -> dead-letter.
  const taskQueueActions = ["z", "z", "x", "z", "z", "z", "x", "z", "z", "z", "x", "z", "z"]
  for (const action of taskQueueActions) {
    await page.keyboard.press(action)
  }
  await expect(page.getByText("Evidencia PASS emitida")).toBeVisible()
  const taskQueueEvidence = await page.evaluate(() => window.__pixelQuestEvidence?.at(-1))
  expect(taskQueueEvidence?.project).toBe("04_concurrent_task_queue")
  expect(taskQueueEvidence?.unit_id).toBe("U-04_concurrent_task_queue")
  expect(taskQueueEvidence?.encounter_id).toBe("encounter-04_concurrent_task_queue")
  expect(taskQueueEvidence?.pass).toBe(true)
  const taskQueueMetrics = taskQueueEvidence?.metrics
  expect(taskQueueMetrics?.kind).toBe("pixelquest-task-queue")
  if (taskQueueMetrics?.kind === "pixelquest-task-queue") {
    expect(taskQueueMetrics.processed).toBe(10)
    expect(taskQueueMetrics.poison_dead_lettered).toBe(3)
    expect(taskQueueMetrics.poison_retried).toBe(0)
    expect(taskQueueMetrics.legit_retried).toBe(0)
    expect(taskQueueMetrics.overheated).toBe(false)
  }
  expect(taskQueueEvidence?.curriculum_context).toMatchObject({
    mechanic: "Worker Queue",
    accepted_signal: "tarefa pronta",
    rejected_trap: "job veneno sem lease",
  })
  expect(taskQueueEvidence?.review_context).toMatchObject({
    scheduler_source: "learner-substrate",
    verifier_required: true,
    streak_candidate: true,
  })
  await page.screenshot({ path: "shots/pixel-quest-task-queue.png", fullPage: true })

  // Persist the full append-only evidence channel as NDJSON — the contract
  // input consumed by learner/gate.
  const evidenceLog = await page.evaluate(() => window.__pixelQuestEvidence ?? [])
  expect(evidenceLog).toHaveLength(6)
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

  // The smoke must emit >=1 valid `EVIDENCE ` console line per completed
  // encounter, including the token-bucket record for 01_rate_limiter and the
  // task-queue record for U-04_concurrent_task_queue. Each line is
  // `EVIDENCE <json>`; parse the payload and assert each record carries the
  // right metrics.kind and verifier_required=true.
  expect(evidenceConsoleLines.length).toBeGreaterThanOrEqual(1)
  const parsedEvidence = evidenceConsoleLines.map((line) =>
    JSON.parse(line.slice("EVIDENCE ".length)),
  )
  const tokenBucketConsoleRecord = parsedEvidence.find(
    (record) => record.project === "01_rate_limiter",
  )
  expect(tokenBucketConsoleRecord).toBeDefined()
  expect(tokenBucketConsoleRecord).toMatchObject({
    unit_id: firstUnitId,
    metrics: { kind: "pixelquest-token-bucket" },
    review_context: { verifier_required: true, scheduler_source: "learner-substrate" },
  })
  const taskQueueConsoleRecord = parsedEvidence.find(
    (record) => record.unit_id === "U-04_concurrent_task_queue",
  )
  expect(taskQueueConsoleRecord).toBeDefined()
  expect(taskQueueConsoleRecord).toMatchObject({
    metrics: { kind: "pixelquest-task-queue" },
    review_context: { verifier_required: true, scheduler_source: "learner-substrate" },
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

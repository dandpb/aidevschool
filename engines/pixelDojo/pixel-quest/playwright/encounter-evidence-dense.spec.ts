import { expect, type Page, test } from "@playwright/test"
import type { PixelQuestEvidenceRecord } from "../src/game/evidence/types"

// AID-1857/t3 — smoke denso (2/3): cada espécie de encontro do registro
// tipado emite evidência válida de ponta a ponta, com o canal dual em sync.
//
// Percorre os 5 kinds do contrato (token_bucket, sequence_flow, policy_gate,
// route_health, task_queue) exercitando as entradas corretas de cada um e
// pina, por registro: literais do envelope, identificadores não-vazios, ts
// ISO estritamente crescente, metrics.kind discriminado, review_context
// (verifier_required + scheduler_source) e a sincronia byte a byte entre o
// canal `EVIDENCE <json>` do console e o canal em página (contrato dual do
// BUG_AUDIT_2026-07-19 #33/#34).

type LabPlan = {
  regionId: string
  regionLabel: string
  trainingLabel: string
  actions: readonly string[]
  project: string
  metricsKind: string
}

const labPlans: readonly LabPlan[] = [
  {
    regionId: "lab-01_rate_limiter",
    regionLabel: "Rate Limiter",
    trainingLabel: "Treino de token bucket",
    actions: ["z", "z", "x", "z", "z", "x", "z", "z", "x", "z", "z", "x"],
    project: "01_rate_limiter",
    metricsKind: "pixelquest-token-bucket",
  },
  {
    regionId: "lab-02_key_value_store",
    regionLabel: "Key Value Store",
    trainingLabel: "Treino de TTL",
    actions: ["z", "z", "x", "z", "x"],
    project: "02_key_value_store",
    metricsKind: "pixelquest-sequence-flow",
  },
  {
    regionId: "lab-04_concurrent_task_queue",
    regionLabel: "Concurrent Task Queue",
    trainingLabel: "Treino de backpressure",
    actions: ["z", "z", "x", "z", "z", "z", "x", "z", "z", "z", "x", "z", "z"],
    project: "04_concurrent_task_queue",
    metricsKind: "pixelquest-task-queue",
  },
  {
    regionId: "lab-07_rest_api_auth",
    regionLabel: "REST API Auth",
    trainingLabel: "Treino de autorizacao",
    actions: ["z", "x", "z", "x", "x", "z"],
    project: "07_rest_api_auth",
    metricsKind: "pixelquest-policy-gate",
  },
  {
    regionId: "lab-11_load_balancer",
    regionLabel: "Load Balancer",
    trainingLabel: "Treino de health check",
    actions: ["z", "x", "z", "x", "z"],
    project: "11_load_balancer",
    metricsKind: "pixelquest-route-health",
  },
]

const expectedKinds = labPlans.map((plan) => plan.metricsKind)
expect(expectedKinds).toEqual([
  "pixelquest-token-bucket",
  "pixelquest-sequence-flow",
  "pixelquest-task-queue",
  "pixelquest-policy-gate",
  "pixelquest-route-health",
])

async function playLab(page: Page, plan: LabPlan): Promise<void> {
  await page.evaluate((id) => window.__pixelQuestDebug?.enterRegion(id), plan.regionId)
  await expect(page.locator(".objective-chip")).toContainText(plan.regionLabel)
  await page.keyboard.press("e")
  await expect(page.getByRole("button", { name: "Abrir treino" })).toBeVisible()
  await page.keyboard.press("Enter")
  await expect(page.getByText(plan.trainingLabel)).toBeVisible()
  await page.keyboard.press("Enter")
  for (const action of plan.actions) {
    await page.keyboard.press(action)
  }
  await expect(page.getByText("Evidencia PASS emitida")).toBeVisible()
}

test("every encounter kind emits schema-valid evidence with dual console/page channels in sync", async ({
  page,
}) => {
  const runtimeErrors: string[] = []
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
  await expect(page.locator("canvas")).toBeVisible()

  for (const plan of labPlans) {
    await playLab(page, plan)
  }

  const channel = await page.evaluate(() => window.__pixelQuestEvidence ?? [])
  expect(channel).toHaveLength(labPlans.length)

  let previousTs = Number.NEGATIVE_INFINITY
  for (const [index, plan] of labPlans.entries()) {
    const record = channel[index] as PixelQuestEvidenceRecord | undefined
    expect(record, `record ${index} (${plan.project})`).toBeDefined()
    if (!record) {
      continue
    }
    // Envelope: literais e identificadores não-vazios.
    expect(record.source).toBe("pixelquest")
    expect(record.game).toBe("PixelDojo Quest")
    expect(record.unit_id).not.toBe("")
    expect(record.encounter_id).not.toBe("")
    expect(record.project).toBe(plan.project)
    expect(record.pass).toBe(true)
    // metrics discriminado por kind — exatamente o kind planejado do lab.
    expect(record.metrics.kind).toBe(plan.metricsKind)
    // ts ISO-8601 válido e estritamente crescente na ordem de jogo.
    const ts = Date.parse(record.ts)
    expect(Number.isNaN(ts)).toBe(false)
    expect(ts).toBeGreaterThan(previousTs)
    previousTs = ts
    // Projeção de revisão read-only vinda do substrato — o verificador decide.
    expect(record.review_context).toMatchObject({
      scheduler_source: "learner-substrate",
      verifier_required: true,
    })
  }

  // Canal dual em sync: uma linha `EVIDENCE <json>` por registro publicado,
  // payload idêntico ao canal em página (ordem inclusive).
  expect(evidenceConsoleLines).toHaveLength(labPlans.length)
  const parsedConsole = evidenceConsoleLines.map((line) =>
    JSON.parse(line.slice("EVIDENCE ".length)),
  )
  expect(parsedConsole).toEqual(channel)

  // Anti-mastery: nenhum efeito colateral de learning gate no browser.
  const sideEffects = await page.evaluate(() => ({
    learningStatePublished: "__pixelQuestLearningState" in window,
    localStorageKeys: Object.keys(localStorage),
  }))
  expect(sideEffects.learningStatePublished).toBe(false)
  for (const forbidden of ["learning_state", "units_log", "mastered"]) {
    expect(sideEffects.localStorageKeys).not.toContain(forbidden)
  }

  await page.screenshot({ path: "shots/pixel-quest-dense-kinds.png", fullPage: true })
  expect(runtimeErrors).toEqual([])
})

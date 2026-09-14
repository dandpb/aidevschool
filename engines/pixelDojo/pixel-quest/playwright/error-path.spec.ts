import { expect, test } from "@playwright/test"
import type { PixelQuestEvidenceRecord } from "../src/game/evidence/types"

// AID-1857/t3 — smoke denso (3/3): guard de pageerror/console-error no
// caminho de ERRO do encontro.
//
// Jogar mal (admitir a rajada abusiva inteira) é um caminho de produto
// legítimo e precisa degradar limpo: evidência FAIL emitida com schema válida
// (o verificador decide, inclusive sobre falhas), zero pageerror, zero
// console.error e nenhum efeito colateral de learning gate.

test("failing an encounter cleanly emits FAIL evidence with zero runtime errors", async ({
  page,
}) => {
  const runtimeErrors: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text())
    }
  })

  await page.goto("/")
  await expect(page.locator("canvas")).toBeVisible()

  // Caminho de erro: admite TUDO (inclusive os 4 requests abusivos) no
  // token bucket — pass exige abusive_admitted === 0, então o veredito é FAIL.
  await page.evaluate(() => window.__pixelQuestDebug?.enterRegion("lab-01_rate_limiter"))
  await expect(page.locator(".objective-chip")).toContainText("Rate Limiter")
  await page.keyboard.press("e")
  await expect(page.getByRole("button", { name: "Abrir treino" })).toBeVisible()
  await page.keyboard.press("Enter")
  await expect(page.getByText("Treino de token bucket")).toBeVisible()
  await page.keyboard.press("Enter")
  for (let step = 0; step < 12; step += 1) {
    await page.keyboard.press("z")
  }

  // O FAIL é comunicado como evidência, não como erro de runtime.
  await expect(page.getByText("Evidencia FAIL emitida")).toBeVisible()
  const evidence = await page.evaluate(
    () => window.__pixelQuestEvidence?.at(-1) as PixelQuestEvidenceRecord | undefined,
  )
  expect(evidence).toBeDefined()
  if (!evidence) {
    return
  }
  expect(evidence.source).toBe("pixelquest")
  expect(evidence.unit_id).toBe("U0-sonda-rate-limiter-robustness")
  expect(evidence.project).toBe("01_rate_limiter")
  expect(evidence.encounter_id).toBe("encounter-agent-quest-01")
  expect(evidence.pass).toBe(false)
  expect(Number.isNaN(Date.parse(evidence.ts))).toBe(false)
  const metrics = evidence.metrics
  expect(metrics.kind).toBe("pixelquest-token-bucket")
  if (metrics.kind === "pixelquest-token-bucket") {
    expect(metrics.good_admits).toBe(8)
    expect(metrics.abusive_admitted).toBe(4)
    expect(metrics.abusive_rejected).toBe(0)
  }

  // O caminho de erro também publica o review_context honesto — a falha é
  // evidência para o verificador, nunca mastery silenciosa.
  expect(evidence.review_context).toMatchObject({
    scheduler_source: "learner-substrate",
    verifier_required: true,
  })

  // Anti-mastery no caminho de erro: nada vaza para learning gate.
  const sideEffects = await page.evaluate(() => ({
    learningStatePublished: "__pixelQuestLearningState" in window,
    localStorageKeys: Object.keys(localStorage),
  }))
  expect(sideEffects.learningStatePublished).toBe(false)
  for (const forbidden of ["learning_state", "units_log", "mastered"]) {
    expect(sideEffects.localStorageKeys).not.toContain(forbidden)
  }

  await page.screenshot({ path: "shots/pixel-quest-error-path.png", fullPage: true })
  expect(runtimeErrors).toEqual([])
})

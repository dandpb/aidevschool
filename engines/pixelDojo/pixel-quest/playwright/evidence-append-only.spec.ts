import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, type Page, test } from "@playwright/test"
import type { PixelQuestEvidenceRecord } from "../src/game/evidence/types"

// AID-1857/t3 — smoke denso (1/3): fluxo returning com o artefato
// `evidence.ndjson` append-only verificado de ponta a ponta.
//
// Pina o contrato do canal dual (EVIDENCE_CONTRACT.md): dentro de uma sessão
// o canal em página é append-only (registro publicado nunca muta, ts
// estritamente crescente); o artefato NDJSON persistido espelha byte a byte
// o canal; ao retornar (reload), o canal em página nasce vazio (sessão-bound)
// e o artefato salvo permanece válido e não corrompido; o replay re-emite
// núcleo determinístico idêntico com ts fresco.

const evidenceLogPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".logs",
  "evidence-append-only.ndjson",
)

const rateLimiterActions = ["z", "z", "x", "z", "z", "x", "z", "z", "x", "z", "z", "x"]
const ttlActions = ["z", "z", "x", "z", "x"]

async function playEncounter(
  page: Page,
  regionId: string,
  regionLabel: string,
  trainingLabel: string,
  actions: readonly string[],
): Promise<PixelQuestEvidenceRecord> {
  await page.evaluate((id) => window.__pixelQuestDebug?.enterRegion(id), regionId)
  await expect(page.locator(".objective-chip")).toContainText(regionLabel)
  await page.keyboard.press("e")
  await expect(page.getByRole("button", { name: "Abrir treino" })).toBeVisible()
  await page.keyboard.press("Enter")
  await expect(page.getByText(trainingLabel)).toBeVisible()
  await page.keyboard.press("Enter")
  for (const action of actions) {
    await page.keyboard.press(action)
  }
  await expect(page.getByText("Evidencia PASS emitida")).toBeVisible()
  const evidence = await page.evaluate(
    () => window.__pixelQuestEvidence?.at(-1) as PixelQuestEvidenceRecord | undefined,
  )
  expect(evidence).toBeDefined()
  return evidence as PixelQuestEvidenceRecord
}

test("returning flow keeps the evidence channel append-only and the NDJSON artifact honest", async ({
  page,
}) => {
  const consoleErrorLines: string[] = []
  const runtimeErrors: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrorLines.push(message.text())
    }
  })

  await page.goto("/")
  await expect(page.locator("canvas")).toBeVisible()

  // Sessão 1 — dois encontros documentados (Rate Limiter, TTL Cache).
  await playEncounter(
    page,
    "lab-01_rate_limiter",
    "Rate Limiter",
    "Treino de token bucket",
    rateLimiterActions,
  )
  const channelAfterFirst = await page.evaluate(() =>
    structuredClone(window.__pixelQuestEvidence ?? []),
  )
  expect(channelAfterFirst).toHaveLength(1)

  const second = await playEncounter(
    page,
    "lab-02_key_value_store",
    "Key Value Store",
    "Treino de TTL",
    ttlActions,
  )
  const channelAfterSecond = await page.evaluate(() =>
    structuredClone(window.__pixelQuestEvidence ?? []),
  )

  // Append-only: o primeiro registro permanece imutável (deep equal) quando o
  // segundo é publicado; o canal cresce sem reescrever história.
  expect(channelAfterSecond).toHaveLength(2)
  expect(channelAfterSecond[0]).toEqual(channelAfterFirst[0])
  expect(channelAfterSecond[1]?.unit_id).toBe(second.unit_id)
  // ts estritamente crescente na ordem de jogo.
  expect(Date.parse(channelAfterSecond[1]?.ts ?? "")).toBeGreaterThan(
    Date.parse(channelAfterSecond[0]?.ts ?? ""),
  )

  // O artefato persistido espelha exatamente o canal (uma linha JSON por
  // registro, na ordem de jogo) — sem mutação na fronteira arquivo/canal.
  mkdirSync(dirname(evidenceLogPath), { recursive: true })
  const artifactBody = `${channelAfterSecond.map((record) => JSON.stringify(record)).join("\n")}\n`
  writeFileSync(evidenceLogPath, artifactBody, "utf8")
  const artifactLines = readFileSync(evidenceLogPath, "utf8").split("\n").filter(Boolean)
  expect(artifactLines).toHaveLength(2)
  expect(JSON.parse(artifactLines[0] ?? "")).toEqual(channelAfterFirst[0])
  expect(JSON.parse(artifactLines[1] ?? "")).toEqual(channelAfterSecond[1])

  // Retorno (reload): canal em página nasce vazio — o artefato salvo é a
  // única ponte durable, e permanece intacto no disco.
  await page.reload()
  await expect(page.locator("canvas")).toBeVisible()
  expect(await page.evaluate(() => window.__pixelQuestEvidence?.length ?? 0)).toBe(0)
  expect(readFileSync(evidenceLogPath, "utf8")).toBe(artifactBody)

  // Replay do primeiro encontro: núcleo determinístico idêntico ao salvo,
  // timestamp fresco (re-emissão, não ressurreição).
  const replay = await playEncounter(
    page,
    "lab-01_rate_limiter",
    "Rate Limiter",
    "Treino de token bucket",
    rateLimiterActions,
  )
  const savedFirst = channelAfterFirst[0] as PixelQuestEvidenceRecord
  expect(replay.unit_id).toBe(savedFirst.unit_id)
  expect(replay.encounter_id).toBe(savedFirst.encounter_id)
  expect(replay.pass).toBe(savedFirst.pass)
  expect(replay.metrics).toEqual(savedFirst.metrics)
  expect(replay.ts).not.toBe(savedFirst.ts)
  expect(await page.evaluate(() => window.__pixelQuestEvidence?.length ?? 0)).toBe(1)

  // O replay não corrompe o artefato salvo da sessão 1.
  expect(readFileSync(evidenceLogPath, "utf8")).toBe(artifactBody)

  await page.screenshot({ path: "shots/pixel-quest-append-only.png", fullPage: true })
  expect(runtimeErrors).toEqual([])
  expect(consoleErrorLines).toEqual([])
})

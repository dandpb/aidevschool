import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

// Byte Stream Reactor — streaming-I/O + bounded-memory smoke.
//
// The player drives the chunk-cannon to slice the canonical wave (5 files ×
// 5 chunks) through the 4-slot buffer at a pace that keeps the peak below
// capacity. The wave ends in a PASS evidence record whose metrics satisfy
// the gate pass rule from docs/plans/06_file_upload_pipeline.md.

const CHUNKS_PER_FILE = 5
const FILES_TARGET = 5
const TOTAL_CHUNKS = CHUNKS_PER_FILE * FILES_TARGET
// Pace slices slower than the 500 ms pipeline drain so the buffer never
// overflows (peak stays at 1 chunk).
const SLICE_PACE_MS = 650

const evidenceLogPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".logs",
  "evidence.ndjson",
)

type Metrics = {
  kind: "threejs-byte-stream"
  files_completed: number
  files_target: number
  bytes_streamed: number
  buffer_capacity_chunks: number
  buffer_peak_chunks: number
  buffer_overflows: number
  whole_file_trap_used: boolean
  invalid_chunks_leaked: number
  size_cap_violations: number
  hasher_match: boolean
  cancellations: number
  throughput_mbps: number
}

type EvidenceRecord = {
  source: "threejs-dojo"
  unit_id: "06_file_upload_pipeline"
  project: "06_file_upload_pipeline"
  encounter_id: string
  game: "Byte Stream Reactor"
  ts: string
  pass: boolean
  metrics: Metrics
  curriculum_context: {
    concept: string
    mechanic: string
    accepted_signal: string
    rejected_trap: string
  }
  review_context: {
    unit_kind: "concept"
    scheduled_review: boolean
    review_reason: string
    streak_candidate: boolean
    scheduler_source: "learner-substrate"
    verifier_required: true
  }
}

test("drives the chunk-cannon through the bounded buffer and emits PASS evidence", async ({
  page,
}) => {
  const runtimeErrors: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text())
  })

  const evidenceLines: string[] = []
  page.on("console", (message) => {
    const text = message.text()
    if (text.startsWith("EVIDENCE ")) {
      evidenceLines.push(text.slice("EVIDENCE ".length))
    }
  })

  await page.goto("/")
  await expect(page.locator(".game-title")).toHaveText("Byte Stream Reactor")
  await expect(page.locator("canvas")).toBeVisible()

  // Confirm the bounded-memory HUD hero element is present.
  await expect(page.locator('[data-key="peak"]')).toContainText("0 / 4")

  // Drive the canonical wave: pace SPACE presses slower than the pipeline
  // drain (500 ms) so the buffer never fills past 1 chunk.
  for (let i = 0; i < TOTAL_CHUNKS; i += 1) {
    await page.keyboard.press(" ")
    await page.waitForTimeout(SLICE_PACE_MS)
  }

  // Wait for the wave banner to appear (wave finalizes once the last chunk
  // completes the pipeline and the last file advances).
  await expect(page.locator(".banner")).toBeVisible({ timeout: 10_000 })
  await expect(page.locator(".banner-title")).toHaveText("WAVE CLEAR")

  // Validate the emitted evidence record.
  const record = await page.evaluate(() => window.__gameEvidence)
  expect(record).toBeTruthy()
  const evidence = record as EvidenceRecord | undefined
  expect(evidence?.source).toBe("threejs-dojo")
  expect(evidence?.unit_id).toBe("06_file_upload_pipeline")
  expect(evidence?.project).toBe("06_file_upload_pipeline")
  expect(evidence?.encounter_id).toBe("byte-stream-reactor-wave-1")
  expect(evidence?.game).toBe("Byte Stream Reactor")
  expect(evidence?.pass).toBe(true)
  expect(Number.isNaN(Date.parse(evidence?.ts ?? ""))).toBe(false)

  const metrics = evidence?.metrics
  expect(metrics?.kind).toBe("threejs-byte-stream")
  expect(metrics?.files_completed).toBe(FILES_TARGET)
  expect(metrics?.files_target).toBe(FILES_TARGET)
  expect(metrics?.bytes_streamed).toBeGreaterThan(0)
  expect(metrics?.buffer_capacity_chunks).toBe(4)
  expect(metrics?.buffer_peak_chunks).toBeLessThanOrEqual(4)
  expect(metrics?.buffer_overflows).toBe(0)
  expect(metrics?.whole_file_trap_used).toBe(false)
  expect(metrics?.invalid_chunks_leaked).toBe(0)
  expect(metrics?.size_cap_violations).toBe(0)
  expect(metrics?.hasher_match).toBe(true)

  expect(evidence?.curriculum_context).toMatchObject({
    concept: "Streaming I/O with bounded memory for large file handling",
    mechanic: "Byte Stream Reactor (chunk-cannon + bounded buffer + pipeline lanes)",
    accepted_signal: "chunked streaming kept buffer peak < capacity, hasher matched",
    rejected_trap: "whole-file buffering (X) overflows memory",
  })
  expect(evidence?.review_context).toMatchObject({
    unit_kind: "concept",
    scheduled_review: true,
    streak_candidate: true,
    scheduler_source: "learner-substrate",
    verifier_required: true,
  })

  // A single EVIDENCE console line must have been emitted.
  expect(evidenceLines).toHaveLength(1)
  const parsed = JSON.parse(evidenceLines[0] ?? "") as EvidenceRecord
  expect(parsed.pass).toBe(true)
  expect(parsed.unit_id).toBe("06_file_upload_pipeline")

  // Persist the durable NDJSON evidence channel (one JSON object per line).
  const channel = await page.evaluate(() => window.__byteStreamEvidence ?? [])
  expect(channel).toHaveLength(1)
  mkdirSync(dirname(evidenceLogPath), { recursive: true })
  writeFileSync(
    evidenceLogPath,
    `${channel.map((rec) => JSON.stringify(rec)).join("\n")}\n`,
    "utf8",
  )

  // Producer ≠ verifier: the game MUST NOT write learner state.
  const sideEffects = await page.evaluate(() => ({
    localStorageKeys: Object.keys(localStorage),
  }))
  expect(sideEffects.localStorageKeys).not.toContain("learning_state")
  expect(sideEffects.localStorageKeys).not.toContain("units_log")
  expect(sideEffects.localStorageKeys).not.toContain("mastered")

  await page.screenshot({ path: "shots/06_file_upload_pipeline.png", fullPage: true })
  expect(runtimeErrors).toEqual([])
})

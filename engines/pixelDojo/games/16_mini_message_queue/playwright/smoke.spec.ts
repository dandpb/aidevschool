import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

/**
 * Browser smoke contract for the Log Pier. Boots WebGL, drives the wave
 * deterministically via the public test hook, and asserts a passing EVIDENCE
 * console line with the project's schema. Concept math is proven in Vitest
 * (src/game/log.test.ts); this spec proves the wiring inside a real browser,
 * end-to-end through partition routing, fetch/commit, and the win rule.
 */
interface MessageQueueEvidence {
  schema: string
  source: string
  unit_id: string
  project: string
  encounter_id: string
  game: string
  ts: string
  pass: boolean
  gates: string[]
  metrics: {
    kind: string
    level: number
    partitions_managed: number
    consumer_groups: number
    messages_inbound: number
    messages_produced: number
    correct_routes: number
    misroutes: number
    ordering_violations: number
    commits: number
    lag_peak: number
    lag_max_tolerance: number
    replays: number
    replay_faults: number
    retention_faults: number
    deadline_misses: number
  }
}

const evidenceLogPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".logs",
  "evidence.ndjson",
)

function parseEvidence(lines: string[]): MessageQueueEvidence[] {
  return lines
    .filter((l) => l.startsWith("EVIDENCE "))
    .map((l) => JSON.parse(l.slice("EVIDENCE ".length)) as MessageQueueEvidence)
}

test("log pier L2 wave — routing + fetch/commit emits a passing evidence record", async ({
  page,
}) => {
  const consoleLines: string[] = []
  const runtimeErrors: string[] = []
  page.on("console", (m) => consoleLines.push(m.text()))
  page.on("pageerror", (err) => runtimeErrors.push(err.message))

  await page.goto("/")
  await expect(page.getByText("Log Pier")).toBeVisible()
  const isWebGL = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#stage")
    if (!canvas) return false
    return canvas.getContext("webgl2") !== null || canvas.getContext("webgl") !== null
  })
  expect(isWebGL).toBe(true)

  // Press START (the button enables interaction; the API hook is live regardless).
  await page.getByTestId("start").click()

  // Drive the wave deterministically. The wave's inbound orb stream is
  // round-robin over partitions [P0, P1, P2, P0, P1, P2, ...] (4 of each = 12
  // total). The deterministic rule: route orb to its keyPartition, then for
  // groups 0 and 1 (on partitions 0 and 1), fetch+commit one slot so lag stays
  // at 1. Partition 2 has no consumer group, so its orbs need no commits.
  await page.evaluate(() => {
    const g = window.__messageQueue
    if (!g) throw new Error("no test hook")
    const wave = g.waveContract
    const groupByPartition = new Map<number, number>()
    for (const grp of wave.consumerGroups) groupByPartition.set(grp.partition, grp.id)
    for (const orb of wave.inboundOrbs) {
      // Route the orb into its key-matching lane (no misroute).
      const partition = orb.explicitPartition ?? orb.keyPartition
      const r = g.produce(partition)
      if (!r.ok) throw new Error(`produce failed at partition ${partition}`)
      // For lanes with a consumer group, fetch+commit immediately to keep
      // lag at 1 (well under tolerance 3).
      const gid = groupByPartition.get(partition)
      if (gid !== undefined) {
        const f = g.fetch(gid)
        if (!f.ok) throw new Error(`fetch failed on group ${gid}`)
        const c = g.commit(gid)
        if (!c.ok) throw new Error(`commit failed on group ${gid}`)
      }
    }
    g.tryEmit()
  })

  // Snapshot assertions — the wave should be fully played out.
  const snap = await page.evaluate(() => window.__messageQueue?.snapshot)
  expect(snap?.messages_inbound).toBe(12)
  expect(snap?.messages_produced).toBe(12)
  expect(snap?.correct_routes).toBe(12)
  expect(snap?.misroutes).toBe(0)
  expect(snap?.ordering_violations).toBe(0)
  expect(snap?.commits).toBe(8)
  expect(snap?.lag_peak).toBeLessThanOrEqual(3)
  expect(snap?.retention_faults).toBe(0)
  expect(snap?.replay_faults).toBe(0)
  expect(snap?.deadline_misses).toBe(0)
  expect(snap?.consumerGroups[0]?.committedOffset).toBe(4)
  expect(snap?.consumerGroups[1]?.committedOffset).toBe(4)

  // Demonstrate replay on group 0 (cursor rewind within retained window).
  // This is non-gated (replays may be > 0); the wave stays passing.
  await page.evaluate(() => {
    const g = window.__messageQueue
    if (!g) throw new Error("no test hook")
    g.replay(0, 1)
  })
  const afterReplay = await page.evaluate(
    () => window.__messageQueue?.snapshot.consumerGroups[0]?.committedOffset,
  )
  expect(afterReplay).toBe(3)

  const records = parseEvidence(consoleLines)
  expect(records).toHaveLength(1)
  const rec = records[0]
  if (!rec) throw new Error("no evidence record")
  expect(rec.schema).toBe("16_mini_message_queue-v1")
  expect(rec.source).toBe("pixelquest")
  expect(rec.unit_id).toBe("16_mini_message_queue")
  expect(rec.project).toBe("16_mini_message_queue")
  expect(rec.encounter_id).toBe("encounter-16_mini_message_queue")
  expect(rec.game).toBe("PixelDojo Quest")
  expect(rec.pass).toBe(true)
  expect(rec.metrics.kind).toBe("threejs-message-queue")
  expect(rec.metrics.level).toBe(2)
  expect(rec.metrics.partitions_managed).toBe(3)
  expect(rec.metrics.consumer_groups).toBe(2)
  expect(rec.metrics.messages_inbound).toBe(12)
  expect(rec.metrics.messages_produced).toBe(12)
  expect(rec.metrics.correct_routes).toBe(12)
  expect(rec.metrics.misroutes).toBe(0)
  expect(rec.metrics.ordering_violations).toBe(0)
  expect(rec.metrics.commits).toBeGreaterThanOrEqual(8)
  expect(rec.metrics.lag_peak).toBeLessThanOrEqual(3)
  expect(rec.metrics.lag_max_tolerance).toBe(3)
  expect(rec.metrics.retention_faults).toBe(0)
  expect(rec.metrics.replay_faults).toBe(0)
  expect(rec.metrics.deadline_misses).toBe(0)
  expect(Number.isNaN(Date.parse(rec.ts))).toBe(false)

  // Producer-only contract: the game never writes learner state.
  const sideEffects = await page.evaluate(() => ({
    published: "__pixelQuestLearningState" in window || "__voxelDojoLearningState" in window,
    ls: Object.keys(localStorage),
  }))
  expect(sideEffects.published).toBe(false)
  expect(sideEffects.ls).not.toContain("learning_state")
  expect(sideEffects.ls).not.toContain("units_log")
  expect(sideEffects.ls).not.toContain("mastered")

  // Persist the record as NDJSON for the verifier.
  mkdirSync(dirname(evidenceLogPath), { recursive: true })
  writeFileSync(evidenceLogPath, `${JSON.stringify(rec)}\n`, "utf8")

  // The in-page channel should match the console record.
  const inPage = await page.evaluate(() => window.__messageQueueEvidence?.at(-1))
  expect(inPage).toMatchObject({ pass: true, unit_id: "16_mini_message_queue" })

  await page.screenshot({ path: "shots/16_mini_message_queue.png", fullPage: true })

  // No runtime errors during the playthrough.
  expect(runtimeErrors).toEqual([])
})

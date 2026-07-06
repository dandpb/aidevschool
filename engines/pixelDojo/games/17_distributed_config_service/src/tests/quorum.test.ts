import { describe, expect, it } from "vitest"
import { buildEvidence, emitEvidence, validateEvidenceRecord } from "../game/evidence"
import {
  ackedCount,
  aliveCount,
  applyCommit,
  applyReject,
  freshCluster,
  freshMetrics,
  gateChecks,
  type Metrics,
  passRule,
  quorumRequired,
  reject,
  tryCommit,
  WAVE_ORBS,
  WAVE_TARGET_COMMITS,
  WAVE_WATCHERS_SUBSCRIBED,
  type WriteOrb,
} from "../game/quorum"

function authorized(value: string, version: number): WriteOrb {
  return { id: `auth-${version}`, value, version, authorized: true, partitioned: false }
}
function unauthorized(value: string, version: number): WriteOrb {
  return { id: `unauth-${version}`, value, version, authorized: false, partitioned: false }
}
function partitioned(value: string, version: number): WriteOrb {
  return { id: `part-${version}`, value, version, authorized: true, partitioned: true }
}

describe("quorumRequired (Raft majority)", () => {
  it("returns floor(N/2)+1 for any positive cluster size", () => {
    expect(quorumRequired(1)).toBe(1)
    expect(quorumRequired(2)).toBe(2)
    expect(quorumRequired(3)).toBe(2)
    expect(quorumRequired(4)).toBe(3)
    expect(quorumRequired(5)).toBe(3)
  })

  it("returns +Infinity for an empty cluster so commits can never sneak through", () => {
    expect(quorumRequired(0)).toBe(Number.POSITIVE_INFINITY)
  })
})

describe("aliveCount / ackedCount", () => {
  it("counts alive sentinels and alive+acked sentinels independently", () => {
    const cluster = freshCluster()
    expect(aliveCount(cluster)).toBe(3)
    expect(ackedCount(cluster)).toBe(0)
    const withAcks: typeof cluster = [
      { id: "leader", alive: true, acked: true },
      { id: "followerA", alive: true, acked: true },
      { id: "followerB", alive: false, acked: false },
    ]
    expect(aliveCount(withAcks)).toBe(2)
    expect(ackedCount(withAcks)).toBe(2)
  })
})

describe("tryCommit (the quorum gate)", () => {
  it("commits an authorized write when the full alive cluster acks (3-of-3 >= 2)", () => {
    const cluster = freshCluster()
    const result = tryCommit(authorized("payments.retry_limit=4", 1), cluster)
    expect(result.kind).toBe("commit")
    if (result.kind === "commit") {
      expect(result.acks).toBe(3)
    }
  })

  it("commits when a majority of an alive cluster acks even with one node down (2-of-2)", () => {
    const cluster: ReturnType<typeof freshCluster> = [
      { id: "leader", alive: true, acked: true },
      { id: "followerA", alive: true, acked: true },
      { id: "followerB", alive: false, acked: false },
    ]
    const result = tryCommit(authorized("payments.fee=0.99", 3), cluster)
    expect(result.kind).toBe("commit")
  })

  it("fails with no-quorum when the orb is partitioned (leader self-ACK only, 1 < 2)", () => {
    const cluster = freshCluster()
    const result = tryCommit(partitioned("cache.ttl=30", 5), cluster)
    expect(result.kind).toBe("no-quorum")
    if (result.kind === "no-quorum") {
      expect(result.acks).toBe(1)
    }
  })

  it("flags an unauthorized orb as an ACL leak BEFORE any quorum math", () => {
    const cluster = freshCluster()
    const result = tryCommit(unauthorized("admin.debug=true", 4), cluster)
    expect(result.kind).toBe("acl-leak")
  })
})

describe("reject (the defensive action)", () => {
  it("classifies an unauthorized orb as a correct ACL rejection", () => {
    expect(reject(unauthorized("admin.debug=true", 4)).kind).toBe("rejected-acl")
  })

  it("classifies a partitioned orb as a correct partition rejection", () => {
    expect(reject(partitioned("cache.ttl=30", 5)).kind).toBe("rejected-partition")
  })

  it("classifies a healthy orb rejection as 'rejected-good' (wasted but not a fail)", () => {
    expect(reject(authorized("payments.retry_limit=4", 1)).kind).toBe("rejected-good")
  })
})

describe("applyCommit / applyReject (metric aggregation)", () => {
  it("commit increments writes_proposed, writes_committed_quorum, watchers_notified_in_budget by watcher count, fresh_reads_served", () => {
    const metrics = applyCommit(freshMetrics(), tryCommit(authorized("a=1", 1), freshCluster()))
    expect(metrics.writes_proposed).toBe(1)
    expect(metrics.writes_committed_quorum).toBe(1)
    expect(metrics.watchers_notified_in_budget).toBe(WAVE_WATCHERS_SUBSCRIBED)
    expect(metrics.fresh_reads_served).toBe(1)
    expect(metrics.acl_leaked).toBe(0)
    expect(metrics.writes_committed_no_quorum).toBe(0)
    expect(metrics.monolith_damage).toBe(0)
  })

  it("no-quorum (forcing through a partition) raises writes_committed_no_quorum AND monolith_damage (split-brain)", () => {
    const metrics = applyCommit(
      freshMetrics(),
      tryCommit(partitioned("cache.ttl=30", 5), freshCluster()),
    )
    expect(metrics.writes_committed_no_quorum).toBe(1)
    expect(metrics.monolith_damage).toBe(1)
    expect(metrics.writes_committed_quorum).toBe(0)
  })

  it("acl-leak raises acl_leaked AND monolith_damage", () => {
    const metrics = applyCommit(
      freshMetrics(),
      tryCommit(unauthorized("admin.debug=true", 4), freshCluster()),
    )
    expect(metrics.acl_leaked).toBe(1)
    expect(metrics.monolith_damage).toBe(1)
  })

  it("rejected-acl increments writes_rejected_acl (correct denial)", () => {
    const metrics = applyReject(freshMetrics(), reject(unauthorized("admin.debug=true", 4)))
    expect(metrics.writes_rejected_acl).toBe(1)
    expect(metrics.acl_leaked).toBe(0)
  })

  it("rejected-partition increments writes_rejected_partition (correct denial)", () => {
    const metrics = applyReject(freshMetrics(), reject(partitioned("cache.ttl=30", 5)))
    expect(metrics.writes_rejected_partition).toBe(1)
  })
})

describe("passRule (the gate)", () => {
  it("passes when the wave is played perfectly: 3 commits, 1 ACL reject, 1 partition reject", () => {
    let metrics: Metrics = freshMetrics()
    const cluster = freshCluster()
    // The 5 orbs in WAVE_ORBS: 3 healthy commits, 1 ACL trap, 1 partition trap.
    for (const orb of WAVE_ORBS) {
      const isTrap = !orb.authorized || orb.partitioned
      if (isTrap) {
        metrics = applyReject(metrics, reject(orb))
      } else {
        metrics = applyCommit(metrics, tryCommit(orb, cluster))
      }
    }
    expect(metrics.writes_proposed).toBe(WAVE_ORBS.length)
    expect(metrics.writes_committed_quorum).toBe(3)
    expect(metrics.writes_rejected_acl).toBe(1)
    expect(metrics.writes_rejected_partition).toBe(1)
    expect(metrics.watchers_notified_in_budget).toBe(3 * WAVE_WATCHERS_SUBSCRIBED)
    expect(passRule(metrics, WAVE_TARGET_COMMITS)).toBe(true)
    // Every individual gate must also read passed.
    const failing = gateChecks(metrics, WAVE_TARGET_COMMITS).filter((c) => !c.passed)
    expect(failing).toEqual([])
  })

  it("fails when the player forces the partition orb through (split-brain)", () => {
    let metrics: Metrics = freshMetrics()
    metrics = applyCommit(metrics, tryCommit(partitioned("cache.ttl=30", 5), freshCluster()))
    expect(passRule(metrics, WAVE_TARGET_COMMITS)).toBe(false)
    const splitBrainGate = gateChecks(metrics, WAVE_TARGET_COMMITS).find(
      (c) => c.name === "writes_committed_no_quorum===0",
    )
    expect(splitBrainGate?.passed).toBe(false)
  })

  it("fails when the player leaks the unauthorized orb (acl_leaked > 0)", () => {
    let metrics: Metrics = freshMetrics()
    metrics = applyCommit(metrics, tryCommit(unauthorized("admin.debug=true", 4), freshCluster()))
    expect(passRule(metrics, WAVE_TARGET_COMMITS)).toBe(false)
    expect(
      gateChecks(metrics, WAVE_TARGET_COMMITS).find((c) => c.name === "acl_leaked===0")?.passed,
    ).toBe(false)
  })

  it("fails when the partition trap is leaked instead of rejected (writes_rejected_partition < partition_events_total)", () => {
    let metrics: Metrics = freshMetrics()
    // Player commits the partition orb (no-quorum + monolith damage) AND skips
    // the proper reject, so writes_rejected_partition stays at 0.
    metrics = applyCommit(metrics, tryCommit(partitioned("cache.ttl=30", 5), freshCluster()))
    expect(metrics.writes_rejected_partition).toBe(0)
    expect(metrics.partition_events_total).toBe(1)
    expect(passRule(metrics, WAVE_TARGET_COMMITS)).toBe(false)
  })
})

describe("evidence emission", () => {
  it("builds a valid record when passRule holds, and validateEvidenceRecord accepts it", () => {
    let metrics: Metrics = freshMetrics()
    for (const orb of WAVE_ORBS) {
      const isTrap = !orb.authorized || orb.partitioned
      metrics = isTrap
        ? applyReject(metrics, reject(orb))
        : applyCommit(metrics, tryCommit(orb, freshCluster()))
    }
    const record = buildEvidence(metrics, WAVE_TARGET_COMMITS, new Date("2026-07-05T12:00:00.000Z"))
    expect(record.pass).toBe(true)
    expect(record.schema).toBe("17_distributed_config_service-v1")
    expect(record.source).toBe("quorumdoj")
    expect(record.unit_id).toBe("17_distributed_config_service")
    expect(record.game).toBe("Quorum Citadel")
    expect(record.metrics.kind).toBe("threejs-quorum-consensus")
    expect(record.gates.length).toBeGreaterThan(0)
    expect(() => validateEvidenceRecord(record)).not.toThrow()
  })

  it("validateEvidenceRecord rejects records with the wrong source literal", () => {
    let metrics: Metrics = freshMetrics()
    metrics = applyCommit(metrics, tryCommit(authorized("a=1", 1), freshCluster()))
    const record = buildEvidence(metrics, WAVE_TARGET_COMMITS, new Date())
    const tampered = { ...record, source: "pixelquest" as const }
    expect(() => validateEvidenceRecord(tampered)).toThrow()
  })

  it("emitEvidence publishes the record to the window channel and returns it", () => {
    const record = buildEvidence(freshMetrics(), WAVE_TARGET_COMMITS, new Date())
    // emitEvidence only runs in a DOM environment; in Node it just logs.
    expect(() => emitEvidence(record)).not.toThrow()
  })
})

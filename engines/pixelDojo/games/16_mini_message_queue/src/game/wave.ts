// Wave contract for the L2 gated attempt — Log Pier.
//
// 3 partition lanes (color-coded pink / green / cyan), 2 consumer groups (on
// partitions 0 and 1), 12 inbound orbs (4 per partition by key color), commit
// target = consumer_groups × commit_per_group = 2 × 4 = 8, lag tolerance 3.
// The deterministic smoke interleaves produce ↔ commit so peak lag stays at
// 1 — well under tolerance. A human player who batches 4 produces before
// committing will hit lag = 4 and fail (the partition-imbalance lesson).

import type { PendingOrb } from "./log"

export const PARTITION_COLORS = ["#f06292", "#66bb6a", "#4fc3f7"] as const
export const PARTITION_LABELS = ["lane-0 (key=A)", "lane-1 (key=B)", "lane-2 (key=C)"] as const
export const L2_LEVEL = 2
export const L2_PARTITION_COUNT = 3
export const L2_CONSUMER_GROUP_COUNT = 2
export const L2_COMMIT_PER_GROUP = 4
export const L2_COMMIT_TARGET = L2_CONSUMER_GROUP_COUNT * L2_COMMIT_PER_GROUP
export const L2_LAG_TOLERANCE = 3
/** L2 wave: retention tide never advances (the L3+ waves turn it on). */
export const L2_RETENTION_ADVANCE_SECONDS = Number.POSITIVE_INFINITY
export const L2_REPLAY_WINDOW = 4

export interface WaveContract {
  readonly level: number
  readonly partitionColors: readonly string[]
  readonly consumerGroups: readonly { id: number; partition: number }[]
  readonly inboundOrbs: readonly PendingOrb[]
  readonly commitTarget: number
  readonly lagMaxTolerance: number
  readonly retentionAdvanceSeconds: number
  readonly replayWindow: number
  readonly lesson: string
}

/**
 * Builds the L2 wave. The inbound orb stream cycles through partition colors
 * round-robin so each lane receives exactly 4 messages. Deadlines are generous
 * (10s each) so the gated attempt is not a twitch game.
 */
export function buildLevel2Wave(): WaveContract {
  const cycleColors: readonly string[] = PARTITION_COLORS
  const total = L2_PARTITION_COUNT * L2_COMMIT_PER_GROUP // 12
  const inboundOrbs: PendingOrb[] = []
  for (let i = 0; i < total; i += 1) {
    const color = cycleColors[i % cycleColors.length]
    if (color === undefined) continue
    const keyPartition = i % L2_PARTITION_COUNT
    inboundOrbs.push({
      keyColor: color,
      keyPartition,
      explicitPartition: null,
      deadline: 10 + i * 4,
    })
  }
  return {
    level: L2_LEVEL,
    partitionColors: PARTITION_COLORS,
    consumerGroups: [
      { id: 0, partition: 0 },
      { id: 1, partition: 1 },
    ],
    inboundOrbs,
    commitTarget: L2_COMMIT_TARGET,
    lagMaxTolerance: L2_LAG_TOLERANCE,
    retentionAdvanceSeconds: L2_RETENTION_ADVANCE_SECONDS,
    replayWindow: L2_REPLAY_WINDOW,
    lesson:
      "Route each key-colored orb to the matching lane (append at nextOffset), " +
      "then fetch+commit each consumer group past its target offset. Lag must stay <= 3.",
  }
}

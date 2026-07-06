// Default wave for the smoke test. Deterministic: the initial ring (3 nodes,
// 3 vnodes each scattered) + an 8-step scripted sequence that exercises every
// win condition of the gate:
//
//   1. SPACE  release "a"   → routes to shard-B   (next-clockwise from 33)
//   2. SPACE  release "f"   → routes to shard-A   (next-clockwise from 38)
//   3. SPACE  release "k"   → routes to shard-A   (next-clockwise from 43)
//   4. A      add shard-D   → splits shard-C's arc (hot key incoming)
//                            0 keys remapped (no locked key in the split arc)
//   5. SPACE  release "p"   → routes to shard-D   (HOT key — now balanced)
//   6. SPACE  release "u"   → routes to shard-B
//   7. SPACE  release "z"   → routes to shard-A   (A now holds f, k, z → overflow)
//   8. X      remove shard-A → churn; f/k/z re-home to shard-D (3 remapped)
//
// D's vnodes [50, 28, 11] are chosen so the split at 50 captures the hot key
// (hashPos 48) while 28 and 11 land in arcs with no locked keys — minimal
// remap, exactly the property consistent hashing promises.
//
// Final metrics (under RING strategy, no MOD-N at churn):
//   keys_routed = 6, misroutes = 0, keys_remapped = 3, remap_budget = 5,
//   churn_events_survived = 2, hot_key_balanced = true, spills = 0,
//   node_count_final = 3, wave_cleared = true.

import { HashRing } from "./ring"
import type { WaveStep } from "./wave"

export const DEFAULT_WAVE_TARGET = 6
export const DEFAULT_SPILL_BUDGET = 2
// ceil(wave_target / initial_node_count) * expected_churn_events + hot_key_relief
// = ceil(6 / 3) * 2 + 1 = 5
export const DEFAULT_REMAP_BUDGET = 5

export const INITIAL_NODES: ReadonlyArray<{
  readonly id: string
  readonly vnodes: readonly number[]
}> = [
  { id: "shard-A", vnodes: [3, 23, 47] },
  { id: "shard-B", vnodes: [13, 37, 57] },
  { id: "shard-C", vnodes: [8, 32, 52] },
]

export function buildInitialRing(): HashRing {
  const ring = new HashRing()
  for (const node of INITIAL_NODES) {
    ring.add(node.id, node.vnodes)
  }
  return ring
}

export function defaultWaveSteps(): readonly WaveStep[] {
  return [
    { kind: "release-orb", key: "a", isHot: false },
    { kind: "release-orb", key: "f", isHot: false },
    { kind: "release-orb", key: "k", isHot: false },
    {
      kind: "add-node-required",
      nodeId: "shard-D",
      vnodes: [50, 28, 11],
      balancesHotKey: true,
      reason: "Hot key incoming on shard-C's arc — split it.",
    },
    { kind: "release-orb", key: "p", isHot: true },
    { kind: "release-orb", key: "u", isHot: false },
    { kind: "release-orb", key: "z", isHot: false },
    {
      kind: "remove-node-required",
      nodeId: "shard-A",
      reason: "shard-A overflow (3 keys) — fail the node; re-home its arc.",
    },
  ]
}

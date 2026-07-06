# Decision — 12_distributed_job_scheduler

**shape: B** (sibling 3D app under `engines/pixelDojo/games/12_distributed_job_scheduler/`)

**Rationale**

1. Distributed Job Scheduler's primary mechanic is **simplified-Raft leader election (terms + votes + majority quorum) + fencing-token dispatch under split-brain** — fundamentally different geometry from pixel-quest's existing encounter kinds (token_bucket / sequence_flow / route_health / policy_gate), which are all variants of "incoming entity → admit/reject" with no notion of *distributed authority* or *competing leaders*. The 3D world needs a ring of node-pedestals with term-height beacons, radial vote beams that converge at quorum, partition curtains that sever node visibility, and worker shields that compare a monotonic fencing token — none of which the pixel-quest shell exposes.
2. The spec's primary learning objective ("coordinating scheduled work safely across multiple nodes when only one scheduler leader may make dispatch decisions") and the catalog's key question ("How do leader election implementations compare in split-brain scenarios?") are best taught as a 3D **Raft Ring** where the player physically calls elections, watches quorum form, dispatches from the leader, and watches stale tokens get fenced at the worker during a 2|3 partition — not as a single-lane `request sprite → token spend` encounter.
3. The mechanic is `kind: "threejs-raft-fencing"` (fresh evidence variant), proving the load-bearing invariant `stale_token_accepted === 0` AND `duplicate_dispatches === 0` — a 3D scene is the only way to render two competing leaders and a worker's last-seen-token shield simultaneously in one readable frame.

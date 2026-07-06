# Decision — 08_event_driven_order_system

**shape: B** (sibling 3D app under `engines/voxelDojo/game-08-timeline-tower/`, port 5208)

**Rationale**

1. The concept is the trinity **append-only event log → async projection → event replay**,
   whose geometry is fundamentally vertical-and-derived: a tower of immutable stacked event
   floors, a floating projection sphere that lags behind, and a replay crank that scrubs log
   time. None of pixel-quest's existing encounter kinds (sequence_flow / policy_gate /
   route_health / token_bucket — all variants of "incoming entity → admit/reject") can express
   an immutable log, a derived read model, or a time-scrub replay. A fresh 3D world is required.
2. `ROUTING_MANIFEST.md` already pins this slug to `game-08-timeline-tower`, unit_id
   `U8-event-driven`, 3D hero "tower of stacked event floors" — Shape B is the canonical path.
3. The done-rule ("how do event replay and projection rebuild times compare") demands the
   player *physically perform a replay* and watch the projection rebuild from the log. That is
   the irreducible 3D interaction: a crank that scrubs through stacked floors while a derived
   sphere re-folds. No 2D encounter surface can carry it honestly.

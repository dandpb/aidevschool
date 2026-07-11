import { type EvidenceRecord, emitEvidenceFor } from "../../../shared/emitEvidenceFor"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = emitEvidenceFor<LevelId>({
  unitId: "U5-websocket-chat",
  project: "05_websocket_chat",
  game: "RELAY STATION",
  scenarioSlug: "relay-station",
  curriculum: {
    concept: "persistent conns + fan-out + heartbeat",
    mechanic: "orbiting relay stations, laser links",
  },
  reviewSlice,
})

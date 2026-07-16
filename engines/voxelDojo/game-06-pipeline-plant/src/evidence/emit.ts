import { type EvidenceRecord, emitEvidenceFor } from "../../../shared/emitEvidenceFor"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = emitEvidenceFor<LevelId>({
  unitId: "U6-file-upload",
  project: "06_file_upload_pipeline",
  game: "PIPELINE PLANT",
  scenarioSlug: "pipeline-plant",
  curriculum: {
    concept: "streaming vs buffering + bounded memory",
    mechanic: "fluid tank + pipe + chunked slugs",
  },
  reviewSlice,
})

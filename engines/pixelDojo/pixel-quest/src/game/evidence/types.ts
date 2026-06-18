export type PixelQuestEvidenceMetrics = {
  readonly target_rate: number
  readonly observed_admit_rate: number
  readonly max_burst_1s: number
  readonly good_admits: number
  readonly legit_rejected: number
  readonly abusive_admitted: number
  readonly abusive_rejected: number
  readonly heat_peak: number
  readonly overheated: boolean
}

export type PixelQuestEvidenceRecord = {
  readonly source: "pixelquest"
  readonly unit_id: string
  readonly project: string
  readonly encounter_id: string
  readonly game: "PixelDojo Quest"
  readonly ts: string
  readonly pass: boolean
  readonly metrics: PixelQuestEvidenceMetrics
}

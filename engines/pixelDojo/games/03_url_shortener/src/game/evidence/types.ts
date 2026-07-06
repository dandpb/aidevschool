// Slug Launcher evidence contract.
//
// The game emits evidence only; the verifier (engines/pixelDojo/verifier or
// its sibling) consumes it and decides the learning gate. The producer NEVER
// writes learner state.

export type SlugLauncherMetrics = {
  readonly kind: "threejs-slug-launcher"
  readonly codes_assigned: number
  readonly collisions_detected: number
  readonly collisions_retried_ok: number
  readonly retries_exhausted: number
  readonly dock_overflows: number
  readonly strategies_used: readonly string[]
  readonly wave_cleared: boolean
  readonly wave_target: number
}

export type SlugLauncherCurriculumContext = {
  readonly concept: string
  readonly mechanic: string
  readonly accepted_signal: string
  readonly rejected_trap: string
}

export type SlugLauncherEvidenceRecord = {
  readonly schema: "03_url_shortener-v1"
  readonly source: "threejs-dojo"
  readonly unit_id: "03_url_shortener"
  readonly project: "03_url_shortener"
  readonly encounter_id: string
  readonly game: "Slug Launcher"
  readonly ts: string
  readonly pass: boolean
  readonly metrics: SlugLauncherMetrics
  readonly curriculum_context: SlugLauncherCurriculumContext
}

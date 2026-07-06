import type { PixelQuestEvidenceMetrics } from "../game/evidence/types"
import type { GamePhase } from "../game/phases/types"
import { gamePhaseOrder } from "../game/phases/types"
import type { ReviewStatus, ReviewTrack } from "../game/review/types"

export function phaseText(phase: GamePhase): string {
  const index = gamePhaseOrder.indexOf(phase)
  return `Fase ${index + 1}/${gamePhaseOrder.length}: ${phaseLabel(phase)}`
}

export function phaseLabel(phase: GamePhase): string {
  if (phase === "briefing") {
    return "Briefing"
  }
  if (phase === "orbit") {
    return "Orbita 3D"
  }
  if (phase === "map") {
    return "Mapa"
  }
  if (phase === "practice") {
    return "Treino"
  }
  if (phase === "duel") {
    return "Duelo"
  }
  if (phase === "evidence") {
    return "Evidencia"
  }
  if (phase === "review") {
    return "Revisao"
  }
  return "Gate"
}

export function reviewStatusLabel(status: ReviewStatus): string {
  if (status === "due") {
    return "due now"
  }
  if (status === "verifier_pending") {
    return "gate pending"
  }
  return "retry due"
}

export function streakText(reviewTrack: ReviewTrack): string {
  return `streak ${reviewTrack.streak.current}${pendingDeltaText(reviewTrack)} freeze ${
    reviewTrack.streak.freezesEquipped
  }/${reviewTrack.streak.freezesMax}`
}

export function pendingDeltaText(reviewTrack: ReviewTrack): string {
  return reviewTrack.streak.pendingGateDelta === 1 ? " +1 pending" : ""
}

export function tokenMeterText(tokens: number): string {
  const full = Math.floor(tokens)
  const cells: string[] = []
  for (let index = 0; index < 6; index += 1) {
    cells.push(index < full ? "[]" : "__")
  }
  return cells.join(" ")
}

// Summarizes the "good accepted" and "abuse leaked" counts from any metrics
// variant into a short human-readable line for the journal HUD. Each kind names
// these concepts differently (admits / routed / allowed / advanced), so this
// switch keeps the HUD decoupled from the metrics schema.
export function evidenceMetricsSummary(metrics: PixelQuestEvidenceMetrics): {
  accepted: number
  leaked: number
} {
  if (metrics.kind === "pixelquest-token-bucket") {
    return { accepted: metrics.good_admits, leaked: metrics.abusive_admitted }
  }
  if (metrics.kind === "pixelquest-route-health") {
    return { accepted: metrics.routed, leaked: metrics.bad_routes }
  }
  if (metrics.kind === "pixelquest-policy-gate") {
    return { accepted: metrics.allowed, leaked: metrics.policy_leaks }
  }
  if (metrics.kind === "pixelquest-task-queue") {
    return { accepted: metrics.processed, leaked: metrics.poison_retried }
  }
  return { accepted: metrics.advanced, leaked: metrics.guards_missed }
}

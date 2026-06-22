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

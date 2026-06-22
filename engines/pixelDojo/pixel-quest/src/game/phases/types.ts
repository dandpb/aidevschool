export type GamePhase = "briefing" | "map" | "practice" | "duel" | "evidence" | "review" | "gate"

export const gamePhaseOrder: readonly GamePhase[] = [
  "briefing",
  "map",
  "practice",
  "duel",
  "evidence",
  "review",
  "gate",
] as const

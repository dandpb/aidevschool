export type GamePhase =
  | "briefing"
  | "orbit"
  | "map"
  | "practice"
  | "duel"
  | "evidence"
  | "review"
  | "gate"

export const gamePhaseOrder: readonly GamePhase[] = [
  "briefing",
  "orbit",
  "map",
  "practice",
  "duel",
  "evidence",
  "review",
  "gate",
] as const

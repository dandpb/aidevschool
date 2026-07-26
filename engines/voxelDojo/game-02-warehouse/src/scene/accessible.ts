import {
  AccessibleProjection,
  type AccessibleProjectionAction,
} from "../../../shared/accessibleProjection"
import type { GameController, GameState } from "../game/controller"

export function createWarehouseAccessibleProjection(
  game: GameController,
  controlsRoot: HTMLElement,
): AccessibleProjection<GameState> {
  return new AccessibleProjection({
    label: "Projeção acessível do armazém de chaves",
    controlsTarget: controlsRoot,
    summarize: (state) => ({
      title: `${state.level.id} — ${state.level.title}`,
      status: statusFor(state),
      description: state.level.lesson,
      details: game.loads().map((load, shelf) => `Prateleira ${shelf}: ${load} caixas`),
    }),
    actions: (state) => actionsFor(state, game),
  })
}

function statusFor(state: GameState): string {
  if (state.phase === "briefing") return "Pronto para iniciar."
  if (state.phase === "cleared") return "Missão concluída; evidência emitida."
  if (state.phase === "failed") return "Critério ainda não atendido; tente novamente."
  if (state.level.id === "L1") {
    const key = state.keys[state.pendingIndex] ?? ""
    return `Caixa ${state.pendingIndex + 1} de ${state.keys.length}: ${key}`
  }
  return "Simulação em andamento. Use os controles detalhados para responder."
}

function actionsFor(state: GameState, game: GameController): readonly AccessibleProjectionAction[] {
  if (state.phase === "briefing")
    return [{ id: "start", label: "Iniciar missão", run: () => game.start() }]
  if (state.phase === "failed")
    return [{ id: "retry", label: "Tentar novamente", run: () => game.retry() }]
  if (state.phase !== "predicting" || state.level.id !== "L1") return []
  return Array.from({ length: state.store.shelfCount }, (_, shelf) => ({
    id: `shelf-${shelf}`,
    label: `Escolher prateleira ${shelf}`,
    run: () => game.predictShelf(shelf),
  }))
}

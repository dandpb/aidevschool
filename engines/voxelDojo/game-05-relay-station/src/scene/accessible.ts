import {
  AccessibleProjection,
  type AccessibleProjectionAction,
} from "../../../shared/accessibleProjection"
import type { GameController, GameState } from "../game/controller"

export function createRelayAccessibleProjection(
  game: GameController,
  controlsRoot: HTMLElement,
): AccessibleProjection<GameState> {
  return new AccessibleProjection({
    label: "Projeção acessível da estação de retransmissão",
    controlsTarget: controlsRoot,
    summarize: (state) => ({
      title: `${state.level.id} — ${state.level.title}`,
      status: statusFor(state),
      description: state.level.lesson,
      details: state.stations.map((station) => {
        const connected = state.state.clients.has(station.id)
        const selected = state.predicted.has(station.id)
        return `${station.id}: ${connected ? "conectada" : "desconectada"}${selected ? ", selecionada" : ""}`
      }),
    }),
    actions: (state) => actionsFor(state, game),
  })
}

function statusFor(state: GameState): string {
  if (state.phase === "briefing") return "Pronto para iniciar."
  if (state.phase === "cleared") return "Missão concluída; evidência emitida."
  if (state.phase === "failed") return "Critério ainda não atendido; tente novamente."
  return `${state.predicted.size} estações selecionadas no canal ${state.broadcastChannel}.`
}

function actionsFor(state: GameState, game: GameController): readonly AccessibleProjectionAction[] {
  if (state.phase === "briefing")
    return [{ id: "start", label: "Iniciar missão", run: () => game.start() }]
  if (state.phase === "failed")
    return [{ id: "retry", label: "Tentar novamente", run: () => game.retry() }]
  if (state.phase !== "predicting") return []
  if (state.level.id === "L4") {
    return state.stations.map((station) => ({
      id: `reconnect-${station.id}`,
      label: `Reconectar ${station.id}`,
      run: () => game.reconnect(station.id),
    }))
  }
  return [
    ...state.stations.map((station) => ({
      id: `station-${station.id}`,
      label: `${state.predicted.has(station.id) ? "Remover" : "Selecionar"} ${station.id}`,
      pressed: state.predicted.has(station.id),
      run: () => game.togglePredict(station.id),
    })),
    { id: "submit", label: "Enviar previsão", run: () => game.submit() },
  ]
}

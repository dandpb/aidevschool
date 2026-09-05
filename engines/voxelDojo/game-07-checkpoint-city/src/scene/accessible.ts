import {
  AccessibleProjection,
  type AccessibleProjectionAction,
} from "../../../shared/accessibleProjection"
import type { GameController, GameState } from "../game/controller"
import type { PredictionTarget } from "../sim/levels"

const PREDICTION_TARGETS: readonly PredictionTarget[] = [
  "reaches-handler",
  "logging",
  "auth",
  "rate-limit",
]

const TARGET_LABELS: Record<PredictionTarget, string> = {
  "reaches-handler": "Chega ao handler (nenhuma parede rejeita)",
  logging: "É rejeitado na parede de logging",
  auth: "É rejeitado na parede de auth (assinatura HMAC)",
  "rate-limit": "É rejeitado na parede de rate-limit (acima do teto)",
}

export function createCheckpointAccessibleProjection(
  game: GameController,
  controlsRoot: HTMLElement,
): AccessibleProjection<GameState> {
  return new AccessibleProjection({
    label: "Projeção acessível da cidade dos checkpoints",
    controlsTarget: controlsRoot,
    summarize: (state) => ({
      title: `${state.level.id} — ${state.level.title}`,
      status: statusFor(state),
      description: state.level.lesson,
      details:
        state.level.id === "L4"
          ? [
              `ordem atual das paredes (externa → interna): ${state.order.join(" → ")}`,
              state.level.passRule,
            ]
          : [
              `pedidos previstos: ${state.predictions.length} de ${state.wave.length}`,
              state.level.passRule,
            ],
    }),
    actions: (state) => actionsFor(state, game),
  })
}

function statusFor(state: GameState): string {
  if (state.phase === "briefing") return "Pronto para iniciar."
  if (state.phase === "cleared") return "Missão concluída; evidência emitida."
  if (state.phase === "failed") return "Critério ainda não atendido; tente novamente."
  if (state.level.id === "L4") return "Reordene as paredes e preveja onde a sonda é rejeitada."
  return `Preveja o destino do pedido ${state.pendingIndex + 1} de ${state.wave.length}.`
}

function actionsFor(state: GameState, game: GameController): readonly AccessibleProjectionAction[] {
  if (state.phase === "briefing")
    return [{ id: "start", label: "Iniciar missão", run: () => game.start() }]
  if (state.phase === "failed")
    return [{ id: "retry", label: "Tentar novamente", run: () => game.retry() }]
  if (state.phase !== "predicting") return []

  if (state.level.id === "L4") {
    const moves: AccessibleProjectionAction[] = []
    state.order.forEach((name, i) => {
      if (i > 0) {
        moves.push({
          id: `move-${i}-up`,
          label: `Mover ${name} uma posição para fora`,
          run: () => game.moveLayer(i, i - 1),
        })
      }
      if (i < state.order.length - 1) {
        moves.push({
          id: `move-${i}-down`,
          label: `Mover ${name} uma posição para dentro`,
          run: () => game.moveLayer(i, i + 1),
        })
      }
    })
    const predictions = PREDICTION_TARGETS.map((target) => ({
      id: `predict-${target}`,
      label: TARGET_LABELS[target],
      run: () => game.commitReorder(target),
    }))
    return [...moves, ...predictions]
  }

  return PREDICTION_TARGETS.map((target) => ({
    id: `predict-${target}`,
    label: TARGET_LABELS[target],
    run: () => game.predict(target),
  }))
}

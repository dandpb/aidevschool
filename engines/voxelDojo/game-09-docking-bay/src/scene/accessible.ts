import {
  AccessibleProjection,
  type AccessibleProjectionAction,
} from "../../../shared/accessibleProjection"
import type { GameController, GameState } from "../game/controller"
import { HOST_CONTRACT } from "../sim/levels"

export function createDockingAccessibleProjection(
  game: GameController,
  controlsRoot: HTMLElement,
): AccessibleProjection<GameState> {
  return new AccessibleProjection({
    label: "Projeção acessível da baía de acoplagem",
    controlsTarget: controlsRoot,
    summarize: (state) => ({
      title: `${state.level.id} — ${state.level.title}`,
      status: statusFor(state),
      description: state.level.lesson,
      details: [
        `contrato do host: ${HOST_CONTRACT.join(", ")}`,
        state.pods.length > 0 ? `pods na fila: ${state.pods.map((pod) => pod.id).join(", ")}` : "",
        state.level.passRule,
      ].filter((detail) => detail !== ""),
    }),
    actions: (state) => actionsFor(state, game),
  })
}

function statusFor(state: GameState): string {
  if (state.phase === "briefing") return "Pronto para iniciar."
  if (state.phase === "cleared") return "Missão concluída; evidência emitida."
  if (state.phase === "failed") return "Critério ainda não atendido; tente novamente."
  if (state.level.id === "L1") return "Preveja se cada pod acopla no clampe estrutural."
  if (state.level.id === "L2") return "Nomeie o método exato que falta em cada pod rejeitado."
  if (state.level.id === "L3") return "Classifique cada invocação como permitida ou bloqueada."
  return "Escolha o conjunto mínimo de capacidades (suficiente e sem excesso)."
}

function actionsFor(state: GameState, game: GameController): readonly AccessibleProjectionAction[] {
  if (state.phase === "briefing")
    return [{ id: "start", label: "Iniciar missão", run: () => game.start() }]
  if (state.phase === "failed")
    return [{ id: "retry", label: "Tentar novamente", run: () => game.retry() }]
  if (state.phase !== "predicting") return []

  if (state.level.id === "L1") {
    return state.pods.flatMap((pod) => [
      {
        id: `dock-yes-${pod.id}`,
        label: `Prever que ${pod.id} acopla`,
        run: () => game.predictDock(pod.id, true),
      },
      {
        id: `dock-no-${pod.id}`,
        label: `Prever que ${pod.id} é rejeitado`,
        run: () => game.predictDock(pod.id, false),
      },
    ])
  }
  if (state.level.id === "L2") {
    return state.pods.flatMap((pod) =>
      (["none", ...HOST_CONTRACT] as const)
        .filter((method) => method !== "connect")
        .map((method) => ({
          id: `missing-${pod.id}-${method}`,
          label: `${pod.id}: falta ${method === "none" ? "nada (acopla)" : method}`,
          run: () => game.predictMissing(pod.id, method),
        })),
    )
  }
  if (state.level.id === "L3") {
    return (state.probe?.invokedMethods ?? []).flatMap((method) => [
      {
        id: `allow-${method}`,
        label: `Permitir ${method} (dentro da bolha)`,
        run: () => game.classifyInvoke(method, true),
      },
      {
        id: `block-${method}`,
        label: `Bloquear ${method} (fora da bolha)`,
        run: () => game.classifyInvoke(method, false),
      },
    ])
  }
  const caps: AccessibleProjectionAction[] = HOST_CONTRACT.map((capability) => ({
    id: `cap-${capability}`,
    label: `Conceder ${capability}`,
    pressed: state.chosenCapabilities.includes(capability),
    run: () => game.toggleCapability(capability),
  }))
  return [
    ...caps,
    {
      id: "lock-in",
      label: "Confirmar conjunto de capacidades",
      run: () => game.lockInCapabilities(),
    },
  ]
}

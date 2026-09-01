import {
  AccessibleProjection,
  type AccessibleProjectionAction,
} from "../../../shared/accessibleProjection"
import type { GameController, GameState } from "../game/controller"

export function createPipelineAccessibleProjection(
  game: GameController,
  controlsRoot: HTMLElement,
): AccessibleProjection<GameState> {
  return new AccessibleProjection({
    label: "Projeção acessível da usina de pipeline",
    controlsTarget: controlsRoot,
    summarize: (state) => ({
      title: `${state.level.id} — ${state.level.title}`,
      status: statusFor(state),
      description: state.level.lesson,
      details: [
        `modo: ${state.level.mode}`,
        `size: ${state.job.size} bytes · capacidade: ${state.job.capacity} bytes`,
        state.level.chunkUnlocked || state.level.mode === "streaming"
          ? `chunk: ${state.job.chunkSize} bytes`
          : "upload em um único lote (buffered)",
      ],
    }),
    actions: (state) => actionsFor(state, game),
  })
}

function statusFor(state: GameState): string {
  if (state.phase === "briefing") return "Pronto para iniciar."
  if (state.phase === "cleared") return "Missão concluída; evidência emitida."
  if (state.phase === "failed") return "Critério ainda não atendido; tente novamente."
  if (state.level.id === "L1") return "Preveja se o upload em lote transborda o tanque."
  if (state.level.id === "L2") return "Preveja se o streaming mantém a memória limitada."
  if (state.level.id === "L3") return "Ajuste o chunk e preveja o pico de memória."
  return "Sob contrapressão: preveja se o upload trava ou transborda."
}

function actionsFor(state: GameState, game: GameController): readonly AccessibleProjectionAction[] {
  if (state.phase === "briefing")
    return [{ id: "start", label: "Iniciar missão", run: () => game.start() }]
  if (state.phase === "failed")
    return [{ id: "retry", label: "Tentar novamente", run: () => game.retry() }]
  if (state.phase !== "predicting") return []
  if (state.level.id === "L1" || state.level.id === "L4") {
    return [
      {
        id: "predict-overflow-yes",
        label: "Prever que transborda",
        run: () => game.predictOverflow(true),
      },
      {
        id: "predict-overflow-no",
        label: "Prever que não transborda",
        run: () => game.predictOverflow(false),
      },
    ]
  }
  if (state.level.id === "L2") {
    return [
      {
        id: "predict-bounded-yes",
        label: "Prever que a memória fica limitada",
        run: () => game.predictBounded(true),
      },
      {
        id: "predict-bounded-no",
        label: "Prever que a memória cresce sem limite",
        run: () => game.predictBounded(false),
      },
    ]
  }
  const chunkActions: AccessibleProjectionAction[] = [20, 40, 60, 80, 100].map((chunk) => ({
    id: `chunk-${chunk}`,
    label: `Chunk de ${chunk} bytes`,
    pressed: state.tunedChunkSize === chunk,
    run: () => game.setChunkSize(chunk),
  }))
  return [
    ...chunkActions,
    {
      id: "lock-in-peak",
      label: "Confirmar chunk e prever pico igual ao chunk",
      run: () => game.lockInPeak(state.tunedChunkSize),
    },
  ]
}

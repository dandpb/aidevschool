import {
  AccessibleProjection,
  type AccessibleProjectionAction,
} from "../../../shared/accessibleProjection"
import type { GameController, GameState } from "../game/controller"

export function createTaskForgeAccessibleProjection(
  game: GameController,
  controlsRoot: HTMLElement,
): AccessibleProjection<GameState> {
  return new AccessibleProjection({
    label: "Projeção acessível da forja de tarefas",
    controlsTarget: controlsRoot,
    summarize: (state) => ({
      title: `${state.level.id} — TASK FORGE: ${state.level.title}`,
      status: statusFor(state),
      description: state.level.lesson,
      details: [
        `Funil: ${state.queue.length}/${state.level.capacity} · braços: ${state.running.length}/${state.level.workerCount}${state.paused ? " (estacionados)" : ""}`,
        `Sucesso: ${state.succeededIds.length} · DLQ: ${state.dlqIds.length} · rack: ${state.queue.filter((t) => t.scheduledFor > state.now).length}`,
        state.inbound
          ? `Empilhadeira ${state.inbound.id} ancorando (prio ${state.inbound.priority}).`
          : "Doca livre.",
      ],
    }),
    actions: (state) => actionsFor(state, game),
  })
}

function statusFor(state: GameState): string {
  if (state.phase === "briefing") return "Pronto para iniciar."
  if (state.phase === "cleared") return "Onda concluída; evidência emitida."
  if (state.phase === "failed") return "Critério do contrato não atendido; tente novamente."
  if (state.paused) return "Braços estacionados; a fila continua aceitando."
  return "Forja em operação. Use os controles detalhados para jogar."
}

function actionsFor(state: GameState, game: GameController): readonly AccessibleProjectionAction[] {
  if (state.phase === "briefing")
    return [{ id: "start", label: "Acender a forja", run: () => game.start() }]
  if (state.phase === "failed")
    return [{ id: "retry", label: "Tentar novamente", run: () => game.retry() }]
  const actions: AccessibleProjectionAction[] = []
  if (state.inbound)
    actions.push({
      id: "reject",
      label: "R — rejeitar empilhadeira (429)",
      run: () => game.rejectInbound(),
    })
  const head = state.finished[0]
  if (head) {
    actions.push({ id: "retry", label: "Rack de têmpera (retry)", run: () => game.classifyRetry() })
    actions.push({ id: "dlq", label: "Calha de sucata (DLQ)", run: () => game.classifyDlq() })
  }
  actions.push({
    id: "pause",
    label: state.paused ? "P — religar braços" : "P — estacionar braços",
    run: () => game.togglePause(),
  })
  return actions
}

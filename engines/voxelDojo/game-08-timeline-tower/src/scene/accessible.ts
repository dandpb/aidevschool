import {
  AccessibleProjection,
  type AccessibleProjectionAction,
} from "../../../shared/accessibleProjection"
import type { GameController, GameState } from "../game/controller"
import { STATUS_CHOICES } from "../sim/levels"
import type { OrderEvent, OrderStatus } from "../sim/sourcing"

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "pendente",
  payment_authorized: "pagamento autorizado",
  payment_failed: "pagamento falhou",
  inventory_reserved: "estoque reservado",
  inventory_rejected: "estoque rejeitado",
  confirmed: "confirmado",
  cancelled: "cancelado",
  shipped: "enviado",
  delivered: "entregue",
}

export function createTimelineAccessibleProjection(
  game: GameController,
  controlsRoot: HTMLElement,
): AccessibleProjection<GameState> {
  return new AccessibleProjection({
    label: "Projeção acessível da torre de eventos",
    controlsTarget: controlsRoot,
    summarize: (state) => ({
      title: `${state.level.id} — ${state.level.title}`,
      status: statusFor(state),
      description: state.level.lesson,
      details: [
        `eventos no log: ${state.log.length}`,
        ...state.log.slice(-3).map((event: OrderEvent) => `${event.type} (ts ${event.ts})`),
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
  if (state.level.id === "L1") return `Escolha o próximo evento do piso ${state.appendStep + 1}.`
  if (state.level.id === "L3" && state.replayAtCheckpoint === null)
    return "Preveja o status no checkpoint."
  if (state.level.id === "L3") return "Preveja o status após o replay completo."
  if (state.level.id === "L4" && state.twoViewOrderStatus === null)
    return "Escolha o status da visão order_status."
  if (state.level.id === "L4") return "Escolha se o pedido está na visão shipment_list."
  return "Preveja o status final do pedido."
}

function actionsFor(state: GameState, game: GameController): readonly AccessibleProjectionAction[] {
  if (state.phase === "briefing")
    return [{ id: "start", label: "Iniciar missão", run: () => game.start() }]
  if (state.phase === "failed")
    return [{ id: "retry", label: "Tentar novamente", run: () => game.retry() }]
  if (state.phase !== "playing") return []

  if (state.level.id === "L1") {
    return game.appendChoices().map((type, index) => ({
      id: `append-${index}-${type}`,
      label: `Anexar ${type}`,
      run: () => game.appendNext(type),
    }))
  }
  if (state.level.id === "L2") {
    return STATUS_CHOICES.map((status) => ({
      id: `status-${status}`,
      label: `Status final: ${STATUS_LABELS[status]}`,
      run: () => game.predictStatus(status),
    }))
  }
  if (state.level.id === "L3") {
    if (state.replayAtCheckpoint === null) {
      return STATUS_CHOICES.map((status) => ({
        id: `checkpoint-${status}`,
        label: `No checkpoint: ${STATUS_LABELS[status]}`,
        run: () => game.predictAtCheckpoint(status),
      }))
    }
    return STATUS_CHOICES.map((status) => ({
      id: `replay-${status}`,
      label: `Após o replay: ${STATUS_LABELS[status]}`,
      run: () => game.predictAfterReplay(status),
    }))
  }
  const statusChoices: AccessibleProjectionAction[] =
    state.twoViewOrderStatus === null
      ? STATUS_CHOICES.map((status) => ({
          id: `view-status-${status}`,
          label: `order_status: ${STATUS_LABELS[status]}`,
          run: () => game.pickOrderStatus(status),
        }))
      : []
  const shippedChoices: AccessibleProjectionAction[] =
    state.twoViewOrderStatus !== null && state.twoViewShipped === null
      ? [
          {
            id: "shipped-yes",
            label: "shipment_list: pedido presente (enviado)",
            run: () => game.pickShipped(true),
          },
          {
            id: "shipped-no",
            label: "shipment_list: pedido ausente",
            run: () => game.pickShipped(false),
          },
        ]
      : []
  return [...statusChoices, ...shippedChoices]
}

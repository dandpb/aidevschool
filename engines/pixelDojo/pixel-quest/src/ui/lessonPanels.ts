import type { ReviewTrack } from "../game/review/types"
import type { HudCallbacks } from "./Hud"
import { phaseText, reviewStatusLabel, streakText } from "./labels"

export type DialoguePanelParams = {
  readonly panel: HTMLElement
  readonly name: string
  readonly dialogue: string
  readonly callbacks: HudCallbacks
}

export type GatePanelParams = {
  readonly panel: HTMLElement
  readonly phase: HTMLElement
  readonly label: string
  readonly callbacks: HudCallbacks
}

export type PracticePanelParams = {
  readonly panel: HTMLElement
  readonly objective: HTMLElement
  readonly status: HTMLElement
  readonly phase: HTMLElement
  readonly prompt: HTMLElement
  readonly reviewTrack: ReviewTrack
  readonly title: string
  readonly practiceTitle: string
  readonly practiceText: string
  readonly admitActionLabel: string
  readonly rejectActionLabel: string
  readonly callbacks: HudCallbacks
}

export function renderDialoguePanel(params: DialoguePanelParams): void {
  params.panel.className = "panel"
  params.panel.innerHTML = ""
  const title = document.createElement("h2")
  title.textContent = params.name
  const body = document.createElement("p")
  body.textContent = params.dialogue.replace(/\s+/g, " ").trim()
  const actions = document.createElement("div")
  actions.className = "panel-actions"
  actions.append(
    makeButton("Abrir treino", params.callbacks.onOpenPractice),
    makeButton("Fechar", params.callbacks.onClosePanel),
  )
  params.panel.append(title, body, actions)
}

export function renderGatePanel(params: GatePanelParams): void {
  params.phase.textContent = phaseText("gate")
  params.panel.className = "panel"
  params.panel.innerHTML = ""
  const title = document.createElement("h2")
  title.textContent = "Gate de regiao"
  const body = document.createElement("p")
  body.textContent = params.label
  params.panel.append(title, body, makeButton("Fechar", params.callbacks.onClosePanel))
}

export function renderPracticePanel(params: PracticePanelParams): void {
  params.objective.textContent = `Treino: ${params.title}`
  params.status.textContent = `Review ${reviewStatusLabel(
    params.reviewTrack.active.status,
  )} | ${streakText(params.reviewTrack)}`
  params.phase.textContent = phaseText("practice")
  params.prompt.textContent = `Z ${params.admitActionLabel} | X ${params.rejectActionLabel}`
  params.panel.className = "panel"
  params.panel.innerHTML = ""

  const title = document.createElement("h2")
  title.textContent = params.practiceTitle
  const body = document.createElement("p")
  body.textContent = params.practiceText
  const actions = document.createElement("div")
  actions.className = "panel-actions"
  actions.append(
    makeButton("Iniciar duelo", params.callbacks.onStartEncounter),
    makeButton("Voltar", params.callbacks.onClosePanel),
  )
  params.panel.append(title, body, actions)
}

function makeButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button")
  button.type = "button"
  button.textContent = label
  button.addEventListener("click", onClick)
  return button
}

import type { ReviewTrack } from "../game/review/types"
import type { SkillOrbitStation } from "../game/simulation/skillOrbit"
import type { HudCallbacks } from "./Hud"
import { phaseText, streakText } from "./labels"

export type BriefingPanelParams = {
  readonly panel: HTMLElement
  readonly objective: HTMLElement
  readonly status: HTMLElement
  readonly phase: HTMLElement
  readonly prompt: HTMLElement
  readonly reviewTrack: ReviewTrack
  readonly totalUnits: number
  readonly callbacks: HudCallbacks
}

export type SkillOrbitPanelParams = {
  readonly panel: HTMLElement
  readonly objective: HTMLElement
  readonly status: HTMLElement
  readonly phase: HTMLElement
  readonly prompt: HTMLElement
  readonly station: SkillOrbitStation
  readonly totalUnits: number
  readonly reviewTrack: ReviewTrack
  readonly callbacks: HudCallbacks
}

export function renderBriefingPanel(params: BriefingPanelParams): void {
  params.objective.textContent = `PixelDojo Quest: ${params.totalUnits} labs do curriculum`
  params.status.textContent = `Review ${params.reviewTrack.active.dueIn} | ${streakText(
    params.reviewTrack,
  )}`
  params.phase.textContent = phaseText("briefing")
  params.prompt.textContent = "Enter: comecar | O: orbita 3D | H: fases"
  params.panel.className = "panel"
  params.panel.innerHTML = ""

  const title = document.createElement("h2")
  title.textContent = "Briefing"
  const body = document.createElement("p")
  body.textContent =
    "Complete cada lab do curriculum como pratica, duelo, evidencia e diario. A orbita 3D mostra a trilha de habilidades antes do gate de mastery."
  const actions = document.createElement("div")
  actions.className = "panel-actions"
  actions.append(
    makeButton("Comecar", params.callbacks.onStartQuest),
    makeButton("Orbita 3D", params.callbacks.onOpenSkillOrbit),
    makeButton("Ver diario", params.callbacks.onOpenJournal),
  )
  params.panel.append(title, body, actions)
}

export function renderSkillOrbitPanel(params: SkillOrbitPanelParams): void {
  const stationNumber = params.station.index + 1
  params.objective.textContent = `Orbita 3D: ${stationNumber}/${params.totalUnits} ${params.station.mechanicName}`
  params.status.textContent = params.station.completed
    ? "Estacao concluida | evidencia emitida"
    : params.station.locked
      ? "Gate bloqueado | complete o prerequisito"
      : `Pronto para praticar | ${streakText(params.reviewTrack)}`
  params.phase.textContent = phaseText("orbit")
  params.prompt.textContent = "Setas A/D: trocar estacao | Enter: abrir lab | O/Esc: fechar"
  params.panel.className = "panel skill-orbit-panel"
  params.panel.innerHTML = ""

  const title = document.createElement("h2")
  title.textContent = params.station.title
  const body = document.createElement("p")
  body.textContent = `${params.station.project}: ${params.station.concept}`
  const actions = document.createElement("div")
  actions.className = "panel-actions"
  const open = makeButton(
    params.station.locked ? "Lab bloqueado" : "Abrir lab",
    params.callbacks.onSelectSkillOrbit,
  )
  open.disabled = params.station.locked
  actions.append(
    makeButton("Anterior", params.callbacks.onOrbitPrevious),
    open,
    makeButton("Proximo", params.callbacks.onOrbitNext),
    makeButton("Fechar", params.callbacks.onClosePanel),
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

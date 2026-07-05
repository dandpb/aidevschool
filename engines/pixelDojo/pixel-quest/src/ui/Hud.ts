import type { EncounterPrompt } from "../game/encounters/registry"
import type { PixelQuestEvidenceRecord } from "../game/evidence/types"
import { type GamePhase, gamePhaseOrder } from "../game/phases/types"
import type { ReviewTrack } from "../game/review/types"
import type { SkillOrbitStation } from "../game/simulation/skillOrbit"
import {
  evidenceMetricsSummary,
  pendingDeltaText,
  phaseLabel,
  phaseText,
  reviewStatusLabel,
  streakText,
  tokenMeterText,
} from "./labels"
import { renderDialoguePanel, renderGatePanel, renderPracticePanel } from "./lessonPanels"
import { renderBriefingPanel, renderSkillOrbitPanel } from "./orbitPanels"

export type HudCallbacks = {
  readonly onStartQuest: () => void
  readonly onOpenSkillOrbit: () => void
  readonly onOrbitPrevious: () => void
  readonly onOrbitNext: () => void
  readonly onSelectSkillOrbit: () => void
  readonly onOpenPractice: () => void
  readonly onStartEncounter: () => void
  readonly onOpenJournal: () => void
  readonly onClosePanel: () => void
  readonly onAdmit: () => void
  readonly onReject: () => void
}

export type EncounterHudState = {
  readonly title: string
  readonly mechanicName: string
  readonly resourceName: string
  readonly goodRequestLabel: string
  readonly badRequestLabel: string
  readonly admitActionLabel: string
  readonly rejectActionLabel: string
  readonly prompt: EncounterPrompt | undefined
  readonly index: number
  readonly total: number
  readonly resourceValue: number
  readonly heatPeak: number
  readonly complete: boolean
  readonly evidence: PixelQuestEvidenceRecord | undefined
}

export class Hud {
  private readonly objective = document.createElement("div")
  private readonly status = document.createElement("div")
  private readonly phase = document.createElement("div")
  private readonly prompt = document.createElement("div")
  private readonly panel = document.createElement("section")

  constructor(
    host: HTMLElement,
    private readonly callbacks: HudCallbacks,
  ) {
    const overlay = document.createElement("div")
    overlay.className = "hud"
    this.objective.className = "objective-chip"
    this.status.className = "status-strip"
    this.phase.className = "phase-strip"
    this.prompt.className = "prompt-chip"
    this.panel.className = "panel hidden"
    overlay.append(this.objective, this.status, this.phase, this.prompt, this.panel)
    host.append(overlay)
  }

  renderWorld(params: {
    readonly objective: string
    readonly completed: boolean
    readonly phase: GamePhase
    readonly prompt: string
    readonly reviewTrack: ReviewTrack
    readonly latestEvidence: PixelQuestEvidenceRecord | undefined
  }): void {
    this.objective.textContent = params.completed
      ? "Objetivo: evidenciar e atravessar o gate"
      : `Objetivo: ${params.objective}`
    this.status.textContent =
      params.latestEvidence?.pass === true
        ? `Evidencia PASS | ${streakText(params.reviewTrack)}`
        : `Review ${reviewStatusLabel(params.reviewTrack.active.status)} | ${streakText(
            params.reviewTrack,
          )}`
    this.phase.textContent = phaseText(params.phase)
    this.prompt.textContent = params.prompt
    this.hidePanel()
  }

  showBriefing(reviewTrack: ReviewTrack, totalUnits: number): void {
    renderBriefingPanel({
      panel: this.panel,
      objective: this.objective,
      status: this.status,
      phase: this.phase,
      prompt: this.prompt,
      reviewTrack,
      totalUnits,
      callbacks: this.callbacks,
    })
  }

  showSkillOrbit(params: {
    readonly station: SkillOrbitStation
    readonly totalUnits: number
    readonly reviewTrack: ReviewTrack
  }): void {
    renderSkillOrbitPanel({
      panel: this.panel,
      objective: this.objective,
      status: this.status,
      phase: this.phase,
      prompt: this.prompt,
      station: params.station,
      totalUnits: params.totalUnits,
      reviewTrack: params.reviewTrack,
      callbacks: this.callbacks,
    })
  }

  showDialogue(name: string, dialogue: string): void {
    renderDialoguePanel({
      panel: this.panel,
      name,
      dialogue,
      callbacks: this.callbacks,
    })
  }

  showPractice(params: {
    readonly reviewTrack: ReviewTrack
    readonly title: string
    readonly practiceTitle: string
    readonly practiceText: string
    readonly admitActionLabel: string
    readonly rejectActionLabel: string
  }): void {
    renderPracticePanel({
      panel: this.panel,
      objective: this.objective,
      status: this.status,
      phase: this.phase,
      prompt: this.prompt,
      reviewTrack: params.reviewTrack,
      title: params.title,
      practiceTitle: params.practiceTitle,
      practiceText: params.practiceText,
      admitActionLabel: params.admitActionLabel,
      rejectActionLabel: params.rejectActionLabel,
      callbacks: this.callbacks,
    })
  }

  showGateMessage(label: string): void {
    renderGatePanel({
      panel: this.panel,
      phase: this.phase,
      label,
      callbacks: this.callbacks,
    })
  }

  showEncounter(state: EncounterHudState): void {
    this.objective.textContent = `Duelo: ${state.mechanicName}`
    this.status.textContent = `${state.resourceName} ${state.resourceValue.toFixed(1)} | Heat ${
      state.heatPeak
    }`
    this.phase.textContent = phaseText(state.complete ? "evidence" : "duel")
    this.prompt.textContent = `Z ${state.admitActionLabel} | X ${state.rejectActionLabel}`
    this.panel.className = "panel encounter-panel"
    this.panel.innerHTML = ""
    const title = document.createElement("h2")
    title.textContent = state.title
    const request = document.createElement("p")
    request.className = "request-line"
    if (state.complete) {
      request.textContent = state.evidence?.pass
        ? "Evidencia PASS emitida. O verificador decide mastery."
        : "Evidencia FAIL emitida. Repita o duelo para praticar."
    } else {
      const requestType =
        state.prompt?.label ??
        (state.prompt?.type === "abuse" ? state.badRequestLabel : state.goodRequestLabel)
      request.textContent = `Pacote ${state.index + 1}/${state.total}: ${requestType}`
    }
    const meter = document.createElement("div")
    meter.className = "token-meter"
    meter.textContent = tokenMeterText(state.resourceValue)
    const actions = document.createElement("div")
    actions.className = "panel-actions"
    if (state.complete) {
      const close = document.createElement("button")
      close.type = "button"
      close.textContent = "Voltar ao mapa"
      close.addEventListener("click", this.callbacks.onClosePanel)
      const journal = document.createElement("button")
      journal.type = "button"
      journal.textContent = "Abrir diario"
      journal.addEventListener("click", this.callbacks.onOpenJournal)
      actions.append(close, journal)
    } else {
      const admit = document.createElement("button")
      admit.type = "button"
      admit.textContent = `Z ${state.admitActionLabel}`
      admit.addEventListener("click", this.callbacks.onAdmit)
      const reject = document.createElement("button")
      reject.type = "button"
      reject.textContent = `X ${state.rejectActionLabel}`
      reject.addEventListener("click", this.callbacks.onReject)
      actions.append(admit, reject)
    }
    this.panel.append(title, request, meter, actions)
  }

  showJournal(evidence: PixelQuestEvidenceRecord | undefined, reviewTrack: ReviewTrack): void {
    this.phase.textContent = phaseText("review")
    this.panel.className = "panel"
    this.panel.innerHTML = ""
    const title = document.createElement("h2")
    title.textContent = "Diario"
    const body = document.createElement("p")
    const reviewLine = `${reviewTrack.active.title}: ${reviewTrack.active.dueIn}`
    const streakLine = `Streak ${reviewTrack.streak.current}${pendingDeltaText(reviewTrack)} | freeze ${
      reviewTrack.streak.freezesEquipped
    }/${reviewTrack.streak.freezesMax}`
    if (evidence === undefined) {
      body.textContent = `${reviewLine}. ${streakLine}. Sem evidencia ainda.`
    } else {
      const { accepted, leaked } = evidenceMetricsSummary(evidence.metrics)
      body.textContent = `${reviewLine}. ${streakLine}. Ultima evidencia: ${
        evidence.pass ? "PASS" : "FAIL"
      }, accepts ${accepted}, leaks ${leaked}.`
    }
    const close = document.createElement("button")
    close.type = "button"
    close.textContent = "Fechar"
    close.addEventListener("click", this.callbacks.onClosePanel)
    this.panel.append(title, body, close)
  }

  showHelp(phase: GamePhase): void {
    this.phase.textContent = phaseText(phase)
    this.panel.className = "panel"
    this.panel.innerHTML = ""
    const title = document.createElement("h2")
    title.textContent = "Fases"
    const body = document.createElement("p")
    body.textContent = gamePhaseOrder
      .map((candidate) =>
        candidate === phase ? `[${phaseLabel(candidate)}]` : phaseLabel(candidate),
      )
      .join(" > ")
    const close = document.createElement("button")
    close.type = "button"
    close.textContent = "Fechar"
    close.addEventListener("click", this.callbacks.onClosePanel)
    this.panel.append(title, body, close)
  }

  private hidePanel(): void {
    this.panel.className = "panel hidden"
    this.panel.innerHTML = ""
  }
}

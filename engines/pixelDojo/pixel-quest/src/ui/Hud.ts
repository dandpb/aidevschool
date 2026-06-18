import type { TokenBucketRequest } from "../content/types"
import type { PixelQuestEvidenceRecord } from "../game/evidence/types"

export type HudCallbacks = {
  readonly onStartEncounter: () => void
  readonly onClosePanel: () => void
  readonly onAdmit: () => void
  readonly onReject: () => void
}

export type EncounterHudState = {
  readonly title: string
  readonly request: TokenBucketRequest | undefined
  readonly index: number
  readonly total: number
  readonly tokens: number
  readonly heatPeak: number
  readonly complete: boolean
  readonly evidence: PixelQuestEvidenceRecord | undefined
}

export class Hud {
  private readonly objective = document.createElement("div")
  private readonly status = document.createElement("div")
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
    this.prompt.className = "prompt-chip"
    this.panel.className = "panel hidden"
    overlay.append(this.objective, this.status, this.prompt, this.panel)
    host.append(overlay)
  }

  renderWorld(params: {
    readonly completed: boolean
    readonly prompt: string
    readonly latestEvidence: PixelQuestEvidenceRecord | undefined
  }): void {
    this.objective.textContent = params.completed
      ? "Objetivo: evidenciar e atravessar o gate"
      : "Objetivo: falar com SONDA e vencer o duelo"
    this.status.textContent = params.latestEvidence?.pass
      ? "Evidencia emitida: PASS"
      : "Unidade ativa: U0 rate limiter"
    this.prompt.textContent = params.prompt
    this.hidePanel()
  }

  showDialogue(name: string, dialogue: string): void {
    this.panel.className = "panel"
    this.panel.innerHTML = ""
    const title = document.createElement("h2")
    title.textContent = name
    const body = document.createElement("p")
    body.textContent = dialogue.replace(/\s+/g, " ").trim()
    const actions = document.createElement("div")
    actions.className = "panel-actions"
    const start = document.createElement("button")
    start.type = "button"
    start.textContent = "Iniciar duelo"
    start.addEventListener("click", this.callbacks.onStartEncounter)
    const close = document.createElement("button")
    close.type = "button"
    close.textContent = "Fechar"
    close.addEventListener("click", this.callbacks.onClosePanel)
    actions.append(start, close)
    this.panel.append(title, body, actions)
  }

  showGateMessage(label: string): void {
    this.panel.className = "panel"
    this.panel.innerHTML = ""
    const title = document.createElement("h2")
    title.textContent = "Gate de regiao"
    const body = document.createElement("p")
    body.textContent = label
    const close = document.createElement("button")
    close.type = "button"
    close.textContent = "Fechar"
    close.addEventListener("click", this.callbacks.onClosePanel)
    this.panel.append(title, body, close)
  }

  showEncounter(state: EncounterHudState): void {
    this.objective.textContent = "Duelo: aplique o token bucket"
    this.status.textContent = `Tokens ${state.tokens.toFixed(1)} | Heat ${state.heatPeak}`
    this.prompt.textContent = "Z admite pacote legitimo | X rejeita abuso"
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
      const requestType = state.request?.type === "abuse" ? "abuso vermelho" : "legitimo verde"
      request.textContent = `Pacote ${state.index + 1}/${state.total}: ${requestType}`
    }
    const meter = document.createElement("div")
    meter.className = "token-meter"
    meter.textContent = tokenMeterText(state.tokens)
    const actions = document.createElement("div")
    actions.className = "panel-actions"
    if (state.complete) {
      const close = document.createElement("button")
      close.type = "button"
      close.textContent = "Voltar ao mapa"
      close.addEventListener("click", this.callbacks.onClosePanel)
      actions.append(close)
    } else {
      const admit = document.createElement("button")
      admit.type = "button"
      admit.textContent = "Z Admitir"
      admit.addEventListener("click", this.callbacks.onAdmit)
      const reject = document.createElement("button")
      reject.type = "button"
      reject.textContent = "X Rejeitar"
      reject.addEventListener("click", this.callbacks.onReject)
      actions.append(admit, reject)
    }
    this.panel.append(title, request, meter, actions)
  }

  showJournal(evidence: PixelQuestEvidenceRecord | undefined): void {
    this.panel.className = "panel"
    this.panel.innerHTML = ""
    const title = document.createElement("h2")
    title.textContent = "Diario"
    const body = document.createElement("p")
    body.textContent =
      evidence === undefined
        ? "Sem evidencia ainda. Fale com SONDA para iniciar o duelo."
        : `Ultima evidencia: ${evidence.pass ? "PASS" : "FAIL"}, admits ${
            evidence.metrics.good_admits
          }, abuso ${evidence.metrics.abusive_admitted}.`
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

function tokenMeterText(tokens: number): string {
  const full = Math.floor(tokens)
  const cells: string[] = []
  for (let index = 0; index < 6; index += 1) {
    cells.push(index < full ? "[]" : "__")
  }
  return cells.join(" ")
}

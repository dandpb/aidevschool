import "./styles.css"
import { buildEvidenceRecord, emitEvidence } from "./game/evidence/emitter"
import {
  aimCannon,
  BUFFER_CAPACITY,
  CHUNKS_PER_FILE,
  cancelUpload,
  computeMetrics,
  createInitialState,
  FILES_TARGET,
  type GameState,
  rejectSizeExceeded,
  sliceChunk,
  swallowWhole,
  tick,
} from "./game/logic"
import { createScene, resizeRenderer, setStatusColor, syncScene } from "./game/scene"

const ENCOUNTER_ID = "byte-stream-reactor-wave-1"
const AIM_STEP = 6 // degrees per arrow press

type HUD = {
  readonly root: HTMLElement
  readonly status: HTMLElement
  readonly filesValue: HTMLElement
  readonly bufferValue: HTMLElement
  readonly peakValue: HTMLElement
  readonly overflowsValue: HTMLElement
  readonly bytesValue: HTMLElement
  readonly hashAccum: HTMLElement
  readonly hashTarget: HTMLElement
  readonly hasherMatchValue: HTMLElement
  readonly fileRemaining: HTMLElement
  readonly memorySlots: readonly HTMLElement[]
  readonly banner: HTMLElement
  readonly bannerTitle: HTMLElement
  readonly bannerDetail: HTMLElement
}

function buildHUD(root: HTMLElement): HUD {
  const hud = document.createElement("div")
  hud.className = "hud"

  const top = document.createElement("div")
  top.className = "hud-top"

  const titlePanel = document.createElement("div")
  titlePanel.className = "title-strip"
  const title = document.createElement("div")
  title.className = "game-title"
  title.textContent = "Byte Stream Reactor"
  const subtitle = document.createElement("div")
  subtitle.className = "unit-id"
  subtitle.textContent = "06_file_upload_pipeline · streaming I/O + bounded memory"
  titlePanel.appendChild(title)
  titlePanel.appendChild(subtitle)

  const brief = document.createElement("div")
  brief.className = "panel brief"
  brief.innerHTML =
    "Carve giant file blocks into <strong>chunks</strong> and stream them through the " +
    "fixed-capacity memory buffer. Keep the buffer peak &lt; capacity, let the hasher " +
    "crystal match its target. <strong>Never swallow a file whole.</strong>"

  top.appendChild(titlePanel)
  top.appendChild(brief)

  const bottom = document.createElement("div")
  bottom.className = "hud-bottom"

  const statePanel = document.createElement("div")
  statePanel.className = "panel"
  statePanel.innerHTML = `
    <p class="panel-title">Pipeline · wave status</p>
    <div class="panel-row"><span class="label">status</span><span class="value" data-key="status">playing</span></div>
    <div class="panel-row"><span class="label">files</span><span class="value" data-key="files">0 / ${FILES_TARGET}</span></div>
    <div class="panel-row"><span class="label">file chunks left</span><span class="value" data-key="remaining">${CHUNKS_PER_FILE}</span></div>
    <div class="panel-row"><span class="label">bytes streamed</span><span class="value" data-key="bytes">0 B</span></div>
    <div class="panel-row"><span class="label">hasher match</span><span class="value value-good" data-key="match">pending</span></div>
    <div class="panel-row" style="margin-top:6px"><span class="label">hash</span><span class="hash-display" data-key="hashAccum">(empty)</span></div>
    <div class="panel-row"><span class="label">target</span><span class="hash-display" data-key="hashTarget">--</span></div>
  `

  const memoryPanel = document.createElement("div")
  memoryPanel.className = "panel"
  memoryPanel.innerHTML = `
    <p class="panel-title">Memory buffer · bounded</p>
    <div class="panel-row"><span class="label">peak</span><span class="value value-good" data-key="peak">0 / ${BUFFER_CAPACITY}</span></div>
    <div class="panel-row"><span class="label">overflows</span><span class="value value-good" data-key="overflows">0</span></div>
    <div class="memory-meter" data-key="memoryMeter"></div>
  `
  const meterHolder = memoryPanel.querySelector<HTMLElement>('[data-key="memoryMeter"]')
  const memorySlots: HTMLElement[] = []
  if (meterHolder !== null) {
    for (let i = 0; i < BUFFER_CAPACITY; i += 1) {
      const slot = document.createElement("div")
      slot.className = "memory-slot"
      meterHolder.appendChild(slot)
      memorySlots.push(slot)
    }
  }

  const controlsPanel = document.createElement("div")
  controlsPanel.className = "panel"
  controlsPanel.innerHTML = `
    <p class="panel-title">Controls</p>
    <div class="controls">
      <span class="keycap"><span class="key">SPACE</span> slice + push chunk</span>
      <span class="keycap"><span class="key">←/→</span> aim cannon</span>
      <span class="keycap"><span class="key">V</span> reject size-exceeded</span>
      <span class="keycap"><span class="key">C</span> cancel upload</span>
      <span class="keycap"><span class="key">X</span> swallow whole (trap)</span>
    </div>
  `

  bottom.appendChild(statePanel)
  bottom.appendChild(memoryPanel)
  bottom.appendChild(controlsPanel)

  const banner = document.createElement("div")
  banner.className = "banner"
  banner.innerHTML = `
    <div class="banner-title" data-key="bannerTitle">WAVE CLEAR</div>
    <div class="banner-detail" data-key="bannerDetail">all chunks streamed</div>
  `

  hud.appendChild(top)
  hud.appendChild(bottom)
  hud.appendChild(banner)
  root.appendChild(hud)

  const mustFind = <T extends HTMLElement>(sel: string): T => {
    const el = hud.querySelector<T>(sel)
    if (el === null) throw new Error(`HUD missing ${sel}`)
    return el
  }

  return {
    root,
    status: mustFind('[data-key="status"]'),
    filesValue: mustFind('[data-key="files"]'),
    bufferValue: mustFind('[data-key="bytes"]'),
    peakValue: mustFind('[data-key="peak"]'),
    overflowsValue: mustFind('[data-key="overflows"]'),
    bytesValue: mustFind('[data-key="bytes"]'),
    hashAccum: mustFind('[data-key="hashAccum"]'),
    hashTarget: mustFind('[data-key="hashTarget"]'),
    hasherMatchValue: mustFind('[data-key="match"]'),
    fileRemaining: mustFind('[data-key="remaining"]'),
    memorySlots,
    banner,
    bannerTitle: mustFind('[data-key="bannerTitle"]'),
    bannerDetail: mustFind('[data-key="bannerDetail"]'),
  }
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KiB`
  }
  return `${bytes} B`
}

function syncHUD(hud: HUD, state: GameState): void {
  hud.status.textContent = state.status
  hud.status.className = "value"
  if (state.status === "won") hud.status.classList.add("value-good")
  if (state.status === "lost") hud.status.classList.add("value-bad")

  hud.filesValue.textContent = `${state.filesCompleted} / ${state.filesTarget}`
  const file = state.currentFile
  hud.fileRemaining.textContent = file === null ? "0" : `${file.totalChunks - file.chunksSliced}`
  hud.bytesValue.textContent = formatBytes(state.bytesStreamed)

  const match = state.hasherAccumulator === state.hasherTarget
  const matchPending = state.status === "playing"
  hud.hasherMatchValue.textContent = matchPending ? "pending" : match ? "yes" : "no"
  hud.hasherMatchValue.className = "value"
  if (!matchPending) {
    hud.hasherMatchValue.classList.add(match ? "value-good" : "value-bad")
  }

  hud.peakValue.textContent = `${state.bufferPeak} / ${state.bufferCapacity}`
  hud.peakValue.className = "value"
  if (state.bufferPeak >= state.bufferCapacity) {
    hud.peakValue.classList.add("value-bad")
  } else if (state.bufferPeak > 0) {
    hud.peakValue.classList.add("value-warn")
  }

  hud.overflowsValue.textContent = `${state.bufferOverflows}`
  hud.overflowsValue.className = "value"
  if (state.bufferOverflows > 0) hud.overflowsValue.classList.add("value-bad")
  else hud.overflowsValue.classList.add("value-good")

  hud.hashAccum.textContent = state.hasherAccumulator || "(empty)"
  hud.hashTarget.textContent = state.hasherTarget

  for (let i = 0; i < hud.memorySlots.length; i += 1) {
    const slot = hud.memorySlots[i]
    if (slot === undefined) continue
    const filledIndex = state.buffer.length - 1 - i
    slot.classList.toggle("filled", filledIndex >= 0)
    slot.classList.toggle("peak", i === state.bufferPeak - 1 && state.bufferPeak > 0)
  }

  hud.banner.classList.toggle("visible", state.status !== "playing")
  if (state.status === "won") {
    hud.banner.classList.add("banner-win")
    hud.banner.classList.remove("banner-lose")
    hud.bannerTitle.textContent = "WAVE CLEAR"
    hud.bannerDetail.textContent = "chunked streaming kept peak < capacity · hasher match"
  } else if (state.status === "lost") {
    hud.banner.classList.add("banner-lose")
    hud.banner.classList.remove("banner-win")
    hud.bannerTitle.textContent = "WAVE FAIL"
    hud.bannerDetail.textContent = state.failReason ?? "see metrics"
  }
}

class Game {
  private state: GameState = createInitialState(0)
  private lastFrameMs: number
  private emitted = false

  constructor(
    private readonly container: HTMLElement,
    private readonly meshes: ReturnType<typeof createScene>,
    private readonly hud: HUD,
  ) {
    this.lastFrameMs = performance.now()
    this.attachInput()
  }

  private attachInput(): void {
    window.addEventListener("keydown", (event) => {
      const key = event.key
      if (key === " " || key === "Spacebar") {
        event.preventDefault()
        this.dispatch("slice")
        return
      }
      if (key === "x" || key === "X") {
        this.dispatch("trap")
        return
      }
      if (key === "c" || key === "C") {
        this.dispatch("cancel")
        return
      }
      if (key === "v" || key === "V") {
        this.dispatch("reject")
        return
      }
      if (key === "ArrowLeft") {
        this.state = aimCannon(this.state, -AIM_STEP)
        return
      }
      if (key === "ArrowRight") {
        this.state = aimCannon(this.state, AIM_STEP)
        return
      }
    })

    this.container.addEventListener("mousemove", (event) => {
      const rect = this.container.getBoundingClientRect()
      const nx = (event.clientX - rect.left) / rect.width - 0.5
      this.state = { ...this.state, cannonAngleDeg: nx * 60 }
    })
  }

  dispatch(action: "slice" | "trap" | "cancel" | "reject"): void {
    const now = performance.now()
    if (action === "slice") this.state = sliceChunk(this.state, now)
    else if (action === "trap") this.state = swallowWhole(this.state)
    else if (action === "cancel") this.state = cancelUpload(this.state)
    else if (action === "reject") this.state = rejectSizeExceeded(this.state)
    if (this.state.status !== "playing") this.emitIfTerminal()
  }

  applyAim(deltaDeg: number): void {
    this.state = aimCannon(this.state, deltaDeg)
  }

  getStateSnapshot(): GameState {
    return this.state
  }

  private emitIfTerminal(): void {
    if (this.emitted) return
    if (this.state.status === "playing") return
    this.emitted = true
    const pass = this.state.status === "won"
    const metrics = computeMetrics(this.state)
    const record = buildEvidenceRecord({
      encounterId: ENCOUNTER_ID,
      pass,
      metrics,
      now: new Date(),
    })
    emitEvidence(record)
  }

  start(): void {
    this.loop()
  }

  private loop = (): void => {
    const now = performance.now()
    const dt = Math.min(100, now - this.lastFrameMs)
    this.lastFrameMs = now

    this.state = tick(this.state, dt)
    if (this.state.status !== "playing") {
      this.emitIfTerminal()
    }

    syncScene(this.meshes, this.state, now)
    setStatusColor(this.meshes, this.state.status)
    syncHUD(this.hud, this.state)
    this.meshes.renderer.render(this.meshes.scene, this.meshes.camera)

    window.requestAnimationFrame(this.loop)
  }
}

function bootstrap(): void {
  const container = document.querySelector<HTMLElement>("#app")
  if (container === null) {
    throw new Error("Missing #app root")
  }
  // Reset DOM in case of HMR.
  container.innerHTML = ""
  const meshes = createScene(container)
  const hud = buildHUD(container)
  const game = new Game(container, meshes, hud)

  window.__byteStreamDebug = {
    getState: () => game.getStateSnapshot(),
    getEvidence: () => window.__byteStreamEvidence,
    press: (action) => game.dispatch(action),
    setAim: (deltaDeg) => game.applyAim(deltaDeg),
  }

  window.addEventListener("resize", () => {
    resizeRenderer(meshes, container)
  })

  game.start()
}

bootstrap()

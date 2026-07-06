// Ring Keeper — entry point. Wires the pure HashRing + wave logic to the
// three.js scene and the DOM HUD, and handles keyboard input. The game emits
// one evidence record when the wave resolves (pass or fail); the smoke spec
// scrapes the `EVIDENCE ` console line.

import "./styles.css"
import {
  buildInitialRing,
  DEFAULT_REMAP_BUDGET,
  DEFAULT_SPILL_BUDGET,
  DEFAULT_WAVE_TARGET,
  defaultWaveSteps,
} from "./game/defaultWave"
import { buildEvidence, emitEvidence } from "./game/evidence"
import { hashToRing } from "./game/ring"
import { RingKeeperScene, type SceneState } from "./game/scene"
import {
  createWaveState,
  currentStep,
  expectedKeyFor,
  handleKey,
  snapshotMetrics,
  type WaveState,
} from "./game/wave"

type GamePhase = "playing" | "finished"

type GameState = {
  readonly wave: WaveState
  phase: GamePhase
  toast: string | null
  toastUntil: number
}

function main(): void {
  const app = document.querySelector("#app")
  if (app === null) {
    throw new Error("#app root not found")
  }
  app.setAttribute("class", "game-shell")

  const canvasHolder = document.createElement("div")
  canvasHolder.setAttribute("class", "game-canvas")
  app.appendChild(canvasHolder)

  const hud = buildHud(app)
  const scene = new RingKeeperScene(canvasHolder)

  const wave = createWaveState(buildInitialRing(), defaultWaveSteps(), {
    waveTarget: DEFAULT_WAVE_TARGET,
    spillBudget: DEFAULT_SPILL_BUDGET,
    remapBudget: DEFAULT_REMAP_BUDGET,
  })

  const state: GameState = {
    wave,
    phase: "playing",
    toast: null,
    toastUntil: 0,
  }

  window.__ringKeeperDebug = {
    stepIndex: () => state.wave.stepIndex,
    finished: () => state.phase === "finished",
    strategy: () => state.wave.strategy,
  }

  const onKey = (event: KeyboardEvent) => handleKeyEvent(event.key, state)
  window.addEventListener("keydown", onKey)

  const resize = () => {
    const rect = canvasHolder.getBoundingClientRect()
    scene.resize(rect.width, rect.height)
  }
  window.addEventListener("resize", resize)

  const loop = () => {
    const now = performance.now()
    scene.sync(buildSceneState(state), now)
    scene.render()
    updateHud(hud, state, now)
    if (state.toast !== null && now > state.toastUntil) {
      state.toast = null
    }
    window.requestAnimationFrame(loop)
  }
  window.requestAnimationFrame(loop)
}

function buildHud(app: Element): HudElements {
  const hud = document.createElement("div")
  hud.setAttribute("class", "hud hud-top")

  const briefing = document.createElement("div")
  briefing.setAttribute("class", "hud-panel")
  briefing.innerHTML = `
    <h1 class="hud-title">Ring Keeper — Consistent Hashing</h1>
    <p class="hud-briefing">A 3D consistent-hash ring. Each key flies to the <strong>next node clockwise</strong> from its hash tick. Adding or removing a shard re-homes only the keys in that arc — minimal remap.</p>
    <p class="hud-briefing">Default strategy: <code>RING</code> (consistent). Press <code>1</code> for the MOD-N trap to feel the catastrophe, <code>2</code> to return to RING.</p>
    <p class="hud-line"><span class="label">Project:</span> <span class="value">10_distributed_cache</span></p>
  `

  const stepPanel = document.createElement("div")
  stepPanel.setAttribute("class", "hud-panel")
  stepPanel.innerHTML = `
    <p class="hud-line"><span class="label">Step:</span> <span class="value" data-step-counter>1 / 1</span></p>
    <p class="hud-step" data-step-line>—</p>
    <p class="hud-line" data-feedback>Press the highlighted key to advance.</p>
  `

  hud.appendChild(briefing)
  hud.appendChild(stepPanel)
  app.appendChild(hud)

  const bottom = document.createElement("div")
  bottom.setAttribute("class", "hud hud-bottom")
  bottom.innerHTML = `
    <div class="hud-controls">
      <div><span class="key">SPACE</span>release orb &nbsp; <span class="key">A</span>add node &nbsp; <span class="key">X</span>remove node</div>
      <div><span class="key">1</span>MOD-N trap &nbsp; <span class="key">2</span>RING (consistent)</div>
    </div>
    <div class="hud-panel">
      <div class="hud-metrics" data-metrics></div>
      <div class="hud-banner" data-banner style="display:none"></div>
      <div class="hud-toast" data-toast></div>
    </div>
  `
  app.appendChild(bottom)

  return {
    stepCounter: stepPanel.querySelector("[data-step-counter]"),
    stepLine: stepPanel.querySelector("[data-step-line]"),
    feedback: stepPanel.querySelector("[data-feedback]"),
    metrics: bottom.querySelector("[data-metrics]"),
    banner: bottom.querySelector("[data-banner]"),
    toast: bottom.querySelector("[data-toast]"),
  }
}

type HudElements = {
  stepCounter: Element | null
  stepLine: Element | null
  feedback: Element | null
  metrics: Element | null
  banner: Element | null
  toast: Element | null
}

function buildSceneState(state: GameState): SceneState {
  const wave = state.wave
  const towers = wave.ring.vnodesSorted().map((v) => ({ nodeId: v.nodeId, pos: v.pos }))
  const orbs = wave.lockedKeys.map((k) => ({
    id: k.id,
    key: k.key,
    hashPos: k.hashPos,
    isHot: k.isHot,
    owner: k.owner,
  }))
  const step = currentStep(wave)
  let incoming: SceneState["incoming"] = null
  let pendingAdd: SceneState["pendingAdd"] = null
  let pendingRemove: SceneState["pendingRemove"] = null
  if (step !== null) {
    if (step.kind === "release-orb") {
      incoming = { key: step.key, hashPos: hashToRing(step.key), isHot: step.isHot }
    } else if (step.kind === "add-node-required") {
      pendingAdd = { nodeId: step.nodeId, vnodes: step.vnodes }
    } else if (step.kind === "remove-node-required") {
      pendingRemove = { nodeId: step.nodeId }
    }
  }
  return {
    towers,
    orbs,
    incoming,
    pendingAdd,
    pendingRemove,
    strategy: wave.strategy,
    finished: state.phase === "finished",
  }
}

function handleKeyEvent(rawKey: string, state: GameState): void {
  if (state.phase === "finished") return
  // Strategy toggles also work mid-step (they don't advance the wave).
  if (rawKey === "1") {
    handleKey(state.wave, "1")
    return
  }
  if (rawKey === "2") {
    handleKey(state.wave, "2")
    return
  }
  const step = currentStep(state.wave)
  if (step === null) return
  const expected = expectedKeyFor(step)
  // Normalize Space — the browser sends "Space" or " " depending on the key.
  const got = rawKey === " " ? "Space" : rawKey
  const want = expected === "Space" ? "Space" : expected.toLowerCase()
  const gotNorm = got === "Space" ? "Space" : got.toLowerCase()
  if (gotNorm !== want) {
    flashToast(
      state,
      `Wrong key for this step. Use ${want === "Space" ? "SPACE" : want.toUpperCase()}.`,
    )
    return
  }
  const outcome = handleKey(state.wave, got)
  if (outcome.kind === "wrong-key") {
    flashToast(state, `Wrong key. Expected ${outcome.expected}.`)
    return
  }
  if (outcome.kind === "advanced" && state.wave.finished) {
    finishWave(state)
  }
}

function flashToast(state: GameState, message: string): void {
  state.toast = message
  state.toastUntil = performance.now() + 1400
}

function finishWave(state: GameState): void {
  state.phase = "finished"
  const metrics = snapshotMetrics(state.wave)
  const record = buildEvidence(metrics, new Date())
  emitEvidence(record)
}

function updateHud(hud: HudElements, state: GameState, _now: number): void {
  const wave = state.wave
  if (hud.stepCounter !== null) {
    const total = wave.steps.length
    const shown = Math.min(wave.stepIndex + 1, total)
    hud.stepCounter.textContent = `${shown} / ${total}`
  }
  if (hud.stepLine !== null) {
    const step = currentStep(wave)
    if (step === null) {
      hud.stepLine.innerHTML = `<span class="kind">—</span> wave complete`
    } else if (step.kind === "release-orb") {
      const hash = hashToRing(step.key)
      const owner = wave.ring.owner(hash, wave.strategy)
      const hotClass = step.isHot ? " hot" : ""
      hud.stepLine.innerHTML = `<span class="kind">RELEASE</span> <span class="key${hotClass}">${step.key}</span> (hash ${hash}) → <span class="node">${owner ?? "—"}</span>`
    } else if (step.kind === "add-node-required") {
      const vnodeList = step.vnodes.join(",")
      hud.stepLine.innerHTML = `<span class="kind">ADD</span> <span class="node">${step.nodeId}</span> at vnodes [${vnodeList}] <span class="expect">— ${step.reason}</span>`
    } else {
      hud.stepLine.innerHTML = `<span class="kind">REMOVE</span> <span class="node">${step.nodeId}</span> <span class="expect">— ${step.reason}</span>`
    }
  }
  if (hud.feedback !== null) {
    const step = currentStep(wave)
    if (step !== null) {
      const k = expectedKeyFor(step)
      const label = k === "Space" ? "SPACE" : k.toUpperCase()
      hud.feedback.textContent = `Press ${label} to advance. Strategy: ${wave.strategy.toUpperCase()}.`
    } else if (state.phase === "finished") {
      hud.feedback.textContent = "Wave resolved — see banner for verdict."
    }
  }
  if (hud.metrics !== null) {
    hud.metrics.innerHTML = renderMetrics(wave)
  }
  if (hud.banner !== null && state.phase === "finished") {
    const m = snapshotMetrics(wave)
    const pass =
      m.wave_cleared &&
      m.misroutes === 0 &&
      m.churn_events_survived >= 1 &&
      m.keys_remapped <= m.remap_budget &&
      !m.modn_used_at_churn &&
      m.hot_key_balanced &&
      m.spills <= m.spill_budget
    hud.banner.setAttribute("class", `hud-banner ${pass ? "pass" : "fail"}`)
    hud.banner.textContent = pass ? "EVIDENCE PASS" : "EVIDENCE FAIL"
    hud.banner.setAttribute("style", "display:inline-block")
  }
  if (hud.toast !== null) {
    hud.toast.textContent = state.toast ?? ""
  }
}

function renderMetrics(wave: WaveState): string {
  const a = wave.accum
  const withinBudget = a.keys_remapped <= wave.remapBudget
  const rows: Array<[string, string, string]> = [
    ["strategy", wave.strategy.toUpperCase(), wave.strategy === "ring" ? "good" : "bad"],
    ["keys routed", `${a.keys_routed}/${wave.waveTarget}`, "good"],
    ["misroutes", `${a.misroutes}`, a.misroutes === 0 ? "good" : "bad"],
    ["keys remapped", `${a.keys_remapped}/${wave.remapBudget}`, withinBudget ? "good" : "bad"],
    ["churn survived", `${a.churn_events_survived}`, a.churn_events_survived >= 1 ? "good" : ""],
    ["node adds", `${a.node_adds}`, ""],
    ["node removes", `${a.node_removes}`, ""],
    ["hot balanced", `${wave.hotKeyBalanced}`, wave.hotKeyBalanced ? "good" : "bad"],
    ["spills", `${a.spills}/${wave.spillBudget}`, a.spills <= wave.spillBudget ? "good" : "bad"],
    ["nodes live", `${wave.ring.size()}`, ""],
  ]
  return rows
    .map(
      ([label, value, cls]) =>
        `<span class="label">${label}</span><span class="value ${cls}">${value}</span>`,
    )
    .join("")
}

main()

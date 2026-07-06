// Metrics Observatory entrypoint.
//
// Boots the WaveController (rules), the ObservatoryScene (three.js), the HUD
// (DOM), wires keyboard input, and exposes the deterministic test hook
// `window.__metricsObservatory` that the Playwright smoke drives.
//
// Producer-only: this game emits evidence via console + window channels; it
// never writes learner state (engines/pixelDojo/verifier owns the gate).

import { WaveController } from "./game/controller"
import { BUCKET_COUNT } from "./game/observatory"
import { WAVE_1 } from "./game/wave"
import { mountHud } from "./scene/hud"
import { ObservatoryScene, type SceneInput } from "./scene/observatoryScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public API deterministically. */
    __metricsObservatory?: WaveController
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const controller = new WaveController(WAVE_1)
const scene = new ObservatoryScene(canvas)
const setHudState = mountHud(hudRoot, controller)

let clawIdx = 0
let aimIdx = 0

function currentInput(): SceneInput {
  const s = controller.snapshot
  return {
    snapshot: s,
    clawIdx,
    aimIdx,
    pendingValue: controller.nextObservation,
    hasPendingPercentile: s.pendingPercentileQueries.length > 0,
  }
}

function pushState(): void {
  setHudState({ clawIdx, aimIdx, pendingValue: controller.nextObservation })
}

function routeCarriedOrb(): void {
  if (controller.nextObservation === null) return
  // Player commits the column under the claw. Matches the smallest `le >=
  // value` rule => accepted; otherwise the orb bounces (misbucketed).
  controller.routeNext(clawIdx)
  pushState()
  controller.tryEmit()
}

function commitPercentileAnswer(): void {
  controller.answerPercentile(aimIdx)
  pushState()
  controller.tryEmit()
}

function setThresholdFromClaw(): void {
  controller.setAlertThreshold(clawIdx)
  pushState()
}

function moveHorizontal(delta: number): void {
  if (controller.snapshot.pendingPercentileQueries.length > 0) {
    aimIdx = clamp(aimIdx + delta, 0, BUCKET_COUNT - 1)
  } else {
    clawIdx = clamp(clawIdx + delta, 0, BUCKET_COUNT - 1)
  }
  pushState()
}

function moveVertical(delta: number): void {
  // Up/Down lifts the alert plane: clawIdx tracks the threshold column.
  clawIdx = clamp(clawIdx + delta, 0, BUCKET_COUNT - 1)
  setThresholdFromClaw()
}

window.addEventListener("keydown", (e) => {
  switch (e.key.toLowerCase()) {
    case "a":
    case "arrowleft":
      moveHorizontal(-1)
      e.preventDefault()
      break
    case "d":
    case "arrowright":
      moveHorizontal(1)
      e.preventDefault()
      break
    case "arrowup":
      moveVertical(1)
      e.preventDefault()
      break
    case "arrowdown":
      moveVertical(-1)
      e.preventDefault()
      break
    case "z":
      routeCarriedOrb()
      e.preventDefault()
      break
    case "x":
      commitPercentileAnswer()
      e.preventDefault()
      break
    case "v":
      controller.ackAlert()
      controller.tryEmit()
      pushState()
      e.preventDefault()
      break
    case " ":
      controller.tick(1)
      controller.tryEmit()
      pushState()
      e.preventDefault()
      break
    default:
      break
  }
})

function renderLoop(): void {
  scene.sync(currentInput())
  scene.render()
  requestAnimationFrame(renderLoop)
}
requestAnimationFrame(renderLoop)

window.__metricsObservatory = controller

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

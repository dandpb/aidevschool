// Log Pier entrypoint.
//
// Boots the WaveController (rules), the LogPierScene (three.js), the HUD (DOM),
// wires keyboard input, and exposes the deterministic test hook
// `window.__messageQueue` that the Playwright smoke drives.
//
// Producer-only: this game emits evidence via console + window channels; it
// never writes learner state (engines/pixelDojo/verifier owns the gate).

import { WaveController } from "./game/controller"
import { buildLevel2Wave } from "./game/wave"
import { mountHud } from "./scene/hud"
import { LogPierScene, type SceneInput } from "./scene/logPierScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public API deterministically. */
    __messageQueue?: WaveController
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const controller = new WaveController(buildLevel2Wave())
const scene = new LogPierScene(canvas)
const setHudState = mountHud(hudRoot, controller)

let focusedPartition = 0
let focusedGroup = 0

function currentInput(): SceneInput {
  return {
    snapshot: controller.snapshot,
    focusedPartition,
    focusedGroup,
  }
}

function pushState(): void {
  setHudState({ focusedPartition, focusedGroup })
}

function routeNextOrb(): void {
  controller.produce(focusedPartition)
  controller.tryEmit()
  pushState()
}

function fetchOrCommit(): void {
  const g = focusedGroup
  const snap = controller.snapshot
  const group = snap.consumerGroups[g]
  if (group === undefined) return
  if (group.fetchedOffset === null) controller.fetch(g)
  else controller.commit(g)
  controller.tryEmit()
  pushState()
}

function replayCursor(): void {
  controller.replay(focusedGroup, 1)
  controller.tryEmit()
  pushState()
}

function moveFocus(delta: number): void {
  const snap = controller.snapshot
  if (snap.mode === "routing") {
    focusedPartition = clamp(focusedPartition + delta, 0, Math.max(0, snap.partitions.length - 1))
  } else {
    focusedGroup = clamp(focusedGroup + delta, 0, Math.max(0, snap.consumerGroups.length - 1))
  }
  pushState()
}

window.addEventListener("keydown", (e) => {
  switch (e.key.toLowerCase()) {
    case "a":
    case "arrowleft":
      moveFocus(-1)
      e.preventDefault()
      break
    case "d":
    case "arrowright":
      moveFocus(1)
      e.preventDefault()
      break
    case "z":
      routeNextOrb()
      e.preventDefault()
      break
    case "x":
      fetchOrCommit()
      e.preventDefault()
      break
    case "c":
      replayCursor()
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

window.__messageQueue = controller

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

import type { CameraRig } from "../scene/camera"
import { DayNightSystem } from "../scene/dayNight"
import { SceneRoot } from "../scene/sceneRoot"
import { Town, type WorldSnapshot } from "../scene/state"

export interface TownControllerOptions {
  /** Initial sim time in 0..24. Defaults to 8 (morning). */
  readonly initialSimTime?: number
}

/**
 * High-level façade that pairs a `Town` (sim state) with a `SceneRoot`
 * (Three.js rendering). The host application constructs a controller once,
 * then drives the loop via `start()`. The same instance is exposed to tests
 * through `window.__miniTown.controller`.
 */
export class TownController {
  readonly town: Town
  readonly sceneRoot: SceneRoot
  readonly cameraRig: CameraRig

  #running = false
  #rafHandle = 0
  #lastTimestamp = 0
  #listeners: Array<(snapshot: WorldSnapshot) => void> = []

  constructor(host: HTMLElement, options: TownControllerOptions = {}) {
    this.town = new Town(new DayNightSystem(options.initialSimTime ?? 8))
    this.sceneRoot = new SceneRoot(host)
    this.cameraRig = this.sceneRoot.cameraRig
    // Push the initial day/night state into the renderer so the first frame
    // already shows the correct lighting, sky, and fog.
    this.sceneRoot.applyDayNight(this.town.dayNight.deltas())
  }

  start(): void {
    if (this.#running) return
    this.#running = true
    this.#lastTimestamp = performance.now()
    this.#rafHandle = requestAnimationFrame(this.#loop)
  }

  stop(): void {
    if (!this.#running) return
    this.#running = false
    if (this.#rafHandle) cancelAnimationFrame(this.#rafHandle)
    this.#rafHandle = 0
  }

  /** Single manual step — handy for headless tests. */
  step(dt: number): WorldSnapshot {
    const snapshot = this.town.tick(dt)
    this.sceneRoot.applyDayNight(this.town.dayNight.deltas())
    this.sceneRoot.render()
    this.#emit(snapshot)
    return snapshot
  }

  get snapshot(): WorldSnapshot {
    return this.town.snapshot()
  }

  onChange(listener: (snapshot: WorldSnapshot) => void): () => void {
    this.#listeners.push(listener)
    return () => {
      this.#listeners = this.#listeners.filter((l) => l !== listener)
    }
  }

  #loop = (timestamp: number): void => {
    if (!this.#running) return
    const dt = Math.min(0.1, (timestamp - this.#lastTimestamp) / 1000)
    this.#lastTimestamp = timestamp
    const snapshot = this.town.tick(dt)
    this.sceneRoot.applyDayNight(this.town.dayNight.deltas())
    this.sceneRoot.render()
    this.#emit(snapshot)
    this.#rafHandle = requestAnimationFrame(this.#loop)
  }

  #emit(snapshot: WorldSnapshot): void {
    for (const listener of this.#listeners) listener(snapshot)
  }
}

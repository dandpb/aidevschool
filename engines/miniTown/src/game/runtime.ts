import type { WorldSnapshot } from "../scene/state"
import { TownView } from "../scene/townView"
import type { TownController } from "./controller"
import { type Cell, TownLife, type ZoneType } from "./townLife"

/** Adds the cozy town loop to the stable scene skeleton without changing its engine contract. */
export class MiniTownRuntime {
  readonly life = new TownLife()
  #view: TownView
  #hoverListeners: Array<(blockId: string | null) => void> = []

  constructor(private readonly controller: TownController) {
    this.#view = new TownView(
      controller.cameraRig.camera,
      controller.sceneRoot.renderer.domElement,
      {
        onPlace: (type, start, end) => this.place(type, start, end),
        onHover: (blockId) => this.#emitHover(blockId),
      },
    )
    controller.sceneRoot.scene.add(this.#view.group)
    controller.onChange((snapshot) => {
      this.life.tick(0.1, snapshot.simTime)
      this.#view.sync(this.life, snapshot.phase)
    })
    this.#view.sync(this.life, controller.snapshot.phase)
  }

  onChange(listener: (snapshot: WorldSnapshot) => void): () => void {
    return this.controller.onChange(listener)
  }
  onHover(listener: (blockId: string | null) => void): () => void {
    this.#hoverListeners.push(listener)
    return () => {
      this.#hoverListeners = this.#hoverListeners.filter((entry) => entry !== listener)
    }
  }
  setTool(tool: ZoneType | null): void {
    this.#view.setTool(tool)
    this.controller.cameraRig.enabled = tool === null
  }
  place(type: ZoneType, start: Cell, end: Cell): void {
    this.life.place(type, start, end)
    this.#view.sync(this.life, this.controller.snapshot.phase)
  }
  #emitHover(blockId: string | null): void {
    for (const listener of this.#hoverListeners) listener(blockId)
  }
}

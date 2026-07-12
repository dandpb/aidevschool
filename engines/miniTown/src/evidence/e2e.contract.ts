import type { TownController } from "../game/controller"
import type { WorldSnapshot } from "../scene/state"
import { WorldView } from "../scene/worldView"

export interface MiniTownContract {
  readonly controller: TownController
  /** The live Three.js scene. Smoke tests inspect this. */
  readonly scene: import("three").Scene
  /** The world renderers — kept in sync with the Town by the change listener. */
  readonly worldView: WorldView
  /** Read-only snapshot of the world — same shape the HUD uses. */
  getSnapshot(): WorldSnapshot
}

/**
 * Install the `window.__miniTown` test hook. The host (main.ts) calls this
 * once after constructing the TownController. Tests and the Playwright
 * smoke pick the controller up through the global.
 *
 * Also wires the WorldView into the scene so placeZone / tick / road-recompute
 * mutations are reflected in the rendered meshes automatically.
 */
export function installE2EContract(controller: TownController): MiniTownContract {
  const worldView = new WorldView(controller.town, controller.sceneRoot.scene)
  const contract: MiniTownContract = {
    controller,
    scene: controller.sceneRoot.scene,
    worldView,
    getSnapshot: () => controller.snapshot,
  }
  ;(window as unknown as { __miniTown: MiniTownContract }).__miniTown = contract
  return contract
}

declare global {
  interface Window {
    /** Public test hook installed by `installE2EContract`. */
    __miniTown?: MiniTownContract
  }
}

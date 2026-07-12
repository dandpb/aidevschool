import type { TownController } from "../game/controller"
import type { WorldSnapshot } from "../scene/state"

export interface MiniTownContract {
  readonly controller: TownController
  /** The live Three.js scene. Smoke tests inspect this. */
  readonly scene: import("three").Scene
  /** Read-only snapshot of the world — same shape the HUD uses. */
  getSnapshot(): WorldSnapshot
}

/**
 * Install the `window.__miniTown` test hook. The host (main.ts) calls this
 * once after constructing the TownController. Tests and the Playwright
 * smoke pick the controller up through the global.
 */
export function installE2EContract(controller: TownController): MiniTownContract {
  const contract: MiniTownContract = {
    controller,
    scene: controller.sceneRoot.scene,
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

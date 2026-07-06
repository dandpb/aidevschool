import { GameController } from "./game/controller"
import { DockingScene } from "./scene/dockingScene"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __dockingBay?: { game: GameController }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController("L1")
const scene = new DockingScene(canvas)
scene.onPodClick = (podId) => {
  // A pod click on L1 defaults to "predict dock"; the legend buttons cover both directions.
  if (game.snapshot.level.id === "L1" && game.snapshot.phase === "predicting") {
    game.predictDock(podId, true)
  }
}
game.subscribe((state) => scene.sync(state))
mountHud(hudRoot, game)

window.__dockingBay = { game }

import { GameController } from "./game/controller"
import { mountHud } from "./scene/hud"
import { WarehouseScene } from "./scene/warehouseScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __warehouse?: { game: GameController }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController("L1")
const scene = new WarehouseScene(canvas)
scene.onShelfClick = (shelf) => {
  // L1 — clicking a 3D shelf predicts the pending crate's hashed shelf.
  if (game.snapshot.level.id === "L1" && game.snapshot.phase === "predicting") {
    game.predictShelf(shelf)
  }
}
game.subscribe((state) => scene.sync(state, game))
mountHud(hudRoot, game)

window.__warehouse = { game }

import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { mountHud } from "./scene/hud"
import { WarehouseScene } from "./scene/warehouseScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __warehouse?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, WarehouseScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new WarehouseScene(canvas),
  windowKey: "__warehouse",
  mountHud,
  wireInteraction: (game, scene) => {
    scene.onShelfClick = (shelf) => {
      // L1 — clicking a 3D shelf predicts the pending crate's hashed shelf.
      if (game.snapshot.level.id === "L1" && game.snapshot.phase === "predicting") {
        game.predictShelf(shelf)
      }
    }
  },
  onState: (state, game, scene) => scene.sync(state, game),
})

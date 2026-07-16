import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { mountHud } from "./scene/hud"
import { TowerScene } from "./scene/towerScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __timelineTower?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, TowerScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new TowerScene(canvas),
  windowKey: "__timelineTower",
  mountHud,
  onState: (_state, game, scene) => {
    const state = game.snapshot
    scene.sync(state, game.truthStatus(), game.truthShipped() ? "shipped" : "none")
  },
})

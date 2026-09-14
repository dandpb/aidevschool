import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { ForgeScene } from "./scene/forgeScene"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __taskForge?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, ForgeScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new ForgeScene(canvas),
  windowKey: "__taskForge",
  mountHud,
  wireInteraction: () => {},
  onState: (state, _game, scene) => scene.sync(state),
})

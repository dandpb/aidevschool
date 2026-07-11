import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { mountHud } from "./scene/hud"
import { WormholeScene } from "./scene/wormholeScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __wormhole?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, WormholeScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new WormholeScene(canvas),
  windowKey: "__wormhole",
  mountHud,
  wireInteraction: (_game, scene) => {
    // Clicking the gate is a soft "confirm" affordance; the real input is the HUD field/buttons.
    scene.onGateClick = () => {
      void scene
    }
  },
  onState: (state, _game, scene) => scene.sync(state),
})

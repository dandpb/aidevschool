import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { BreakerScene } from "./scene/breakerScene"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __breakerGrid?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, BreakerScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new BreakerScene(canvas),
  windowKey: "__breakerGrid",
  mountHud,
  wireInteraction: (game, scene) => {
    scene.onDistrictClick = (districtId) => {
      game.selectDistrict(districtId)
    }
  },
  onState: (state, _game, scene) => scene.sync(state),
})

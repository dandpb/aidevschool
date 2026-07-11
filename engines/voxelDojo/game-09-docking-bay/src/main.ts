import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { DockingScene } from "./scene/dockingScene"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __dockingBay?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, DockingScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new DockingScene(canvas),
  windowKey: "__dockingBay",
  mountHud,
  wireInteraction: (game, scene) => {
    scene.onPodClick = (podId) => {
      // A pod click on L1 defaults to "predict dock"; the legend buttons cover both directions.
      if (game.snapshot.level.id === "L1" && game.snapshot.phase === "predicting") {
        game.predictDock(podId, true)
      }
    }
  },
  onState: (state, _game, scene) => scene.sync(state),
})

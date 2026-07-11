import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { DeltaScene } from "./scene/deltaScene"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __riverDelta?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, DeltaScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new DeltaScene(canvas),
  windowKey: "__riverDelta",
  mountHud,
  wireInteraction: (game, scene) => {
    scene.onHeadwaterClick = (sourceId) => {
      const lvl = game.snapshot.level.id
      if (lvl === "L1") game.predictSource(sourceId)
      if (lvl === "L3") {
        if (game.snapshot.injectSource === null) game.injectDye(sourceId)
        else game.togglePredictedDyeSource(sourceId)
      }
    }
  },
  onState: (state, _game, scene) => scene.sync(state),
})

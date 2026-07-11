import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { CheckpointScene } from "./scene/checkpointScene"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __checkpointCity?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, CheckpointScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new CheckpointScene(canvas),
  windowKey: "__checkpointCity",
  mountHud,
  wireInteraction: (game, scene) => {
    scene.onGateClick = (target) => {
      const lvl = game.snapshot.level.id
      if (lvl === "L4") game.commitReorder(target)
      else game.predict(target)
    }
  },
  onState: (state, _game, scene) => scene.sync(state),
})

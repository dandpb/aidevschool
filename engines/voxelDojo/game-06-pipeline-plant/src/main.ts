import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { mountHud } from "./scene/hud"
import { PipelineScene } from "./scene/pipelineScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __pipelinePlant?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, PipelineScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new PipelineScene(canvas),
  windowKey: "__pipelinePlant",
  mountHud,
  wireInteraction: (game, scene) => {
    scene.onTankClick = () => {
      const level = game.snapshot.level.id
      // clicking the tank toggles the current overflow/bounded prediction preview (L1/L2/L4 buffered)
      if (level === "L1" || level === "L4") game.predictOverflow(!game.bufferedOverflows())
    }
  },
  onState: (state, _game, scene) => scene.sync(state),
})

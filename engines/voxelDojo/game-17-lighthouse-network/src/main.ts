import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { mountHud } from "./scene/hud"
import { LighthouseScene } from "./scene/lighthouseScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __lighthouseNetwork?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, LighthouseScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new LighthouseScene(canvas),
  windowKey: "__lighthouseNetwork",
  mountHud,
  wireInteraction: (game, scene) => {
    scene.onLighthouseClick = (nodeId) => {
      const level = game.snapshot.level.id
      if (level === "L1" || level === "L2") game.ackNode(nodeId)
      if (level === "L2") game.togglePredictedWatcher(nodeId)
      if (level === "L4") game.toggleSynced(nodeId)
    }
  },
  onState: (state, _game, scene) => scene.sync(state),
})

import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { mountHud } from "./scene/hud"
import { ObservatoryScene } from "./scene/observatoryScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __observatory?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, ObservatoryScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new ObservatoryScene(canvas),
  windowKey: "__observatory",
  mountHud,
  wireInteraction: (game, scene) => {
    scene.onBucketClick = (bucket) => {
      const lvl = game.snapshot.level.id
      if (lvl === "L1") game.predictBucket(bucket)
      if (lvl === "L2") game.predictPercentileBucket(bucket)
    }
  },
  onState: (state, _game, scene) => scene.sync(state),
})

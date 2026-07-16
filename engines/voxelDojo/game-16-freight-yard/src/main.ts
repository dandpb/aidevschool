import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { FreightScene } from "./scene/freightScene"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __freightYard?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, FreightScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new FreightScene(canvas),
  windowKey: "__freightYard",
  mountHud,
  wireInteraction: (game, scene) => {
    // Lane clicks drive L1 routing; car clicks drive L4 replay selection.
    scene.onLaneClick = (partition) => {
      const level = game.snapshot.level.id
      if (level === "L1") game.predictRoute(partition)
    }
    scene.onCarClick = (partition, offset) => {
      const level = game.snapshot.level.id
      if (level === "L4") {
        // focus the rewind on this lane and toggle the offset as a predicted replay car
        game.toggleReplayOffset(offset)
        if (partition !== game.snapshot.replayPuzzle?.partition) return
      }
    }
  },
  onState: (state, _game, scene) => scene.sync(state),
})

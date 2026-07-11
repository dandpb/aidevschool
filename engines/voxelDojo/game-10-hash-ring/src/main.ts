import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { mountHud } from "./scene/hud"
import { RingScene } from "./scene/ringScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __hashRing?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, RingScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new RingScene(canvas),
  windowKey: "__hashRing",
  mountHud,
  wireInteraction: (game, scene) => {
    scene.onStationClick = (stationId: string) => {
      const level = game.snapshot.level.id
      if (level === "L1") game.predictOwner(stationId)
      if (level === "L2") game.predictLoser(stationId)
    }
  },
  onState: (state, game, scene) => scene.sync(state, game.loads()),
})

import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { mountHud } from "./scene/hud"
import { RelayScene } from "./scene/relayScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __relayStation?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, RelayScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new RelayScene(canvas),
  windowKey: "__relayStation",
  mountHud,
  wireInteraction: (game, scene) => {
    scene.onStationClick = (stationId) => {
      const lvl = game.snapshot.level.id
      // L4 is reconnect-first: clicking the dropped target reconnects it.
      if (lvl === "L4") {
        game.reconnect(stationId)
        return
      }
      // L1/L2/L3 toggle the station in/out of the predicted set.
      game.togglePredict(stationId)
    }
  },
  onState: (state, _game, scene) => scene.sync(state),
})

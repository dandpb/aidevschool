import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { AirScene } from "./scene/airScene"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __airTraffic?: { game: GameController }
  }
}

// Edge-trigger bookkeeping for the probe flash. Lives at module scope so the
// onState closure can read/update it across state changes.
let lastProbeFired = false

createSceneHarness<GameState, GameController, AirScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new AirScene(canvas),
  windowKey: "__airTraffic",
  mountHud,
  wireInteraction: (game, scene) => {
    scene.onPadClick = (padId) => {
      if (game.snapshot.phase === "predicting") game.predictPad(padId)
    }
  },
  onState: (state, _game, scene) => {
    // When probeFired flips true, flash the beams (rising-edge side effect).
    if (state.probeFired && !lastProbeFired) scene.flashProbes(state)
    lastProbeFired = state.probeFired
    scene.sync(state)
  },
})

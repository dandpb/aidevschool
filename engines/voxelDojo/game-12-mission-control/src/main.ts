import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { mountHud } from "./scene/hud"
import { MissionScene } from "./scene/missionScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __missionControl?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, MissionScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new MissionScene(canvas),
  windowKey: "__missionControl",
  mountHud,
  wireInteraction: (game, scene) => {
    scene.onStationClick = (stationId) => {
      const lvl = game.snapshot.level.id
      const state = game.snapshot
      // After a kill on L2/L4, a station click predicts the successor.
      if (state.killedLeaderId !== null) {
        game.predictLeader(stationId)
        return
      }
      // On election levels a station click predicts the leader.
      if (lvl === "L1" || lvl === "L2") game.predictLeader(stationId)
    }
    scene.onJobClick = (jobId) => game.launchJob(jobId)
  },
  onState: (state, _game, scene) => scene.sync(state),
})

import { GameController } from "./game/controller"
import { mountHud } from "./scene/hud"
import { MissionScene } from "./scene/missionScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __missionControl?: { game: GameController }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController("L1")
const scene = new MissionScene(canvas)
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

game.subscribe((state) => scene.sync(state))
mountHud(hudRoot, game)

window.__missionControl = { game }

import { GameController } from "./game/controller"
import { mountHud } from "./scene/hud"
import { RelayScene } from "./scene/relayScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __relayStation?: { game: GameController }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController("L1")
const scene = new RelayScene(canvas)
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
game.subscribe((state) => scene.sync(state))
mountHud(hudRoot, game)

window.__relayStation = { game }

import { GameController } from "./game/controller"
import { mountHud } from "./scene/hud"
import { RingScene } from "./scene/ringScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __hashRing?: { game: GameController }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController("L1")
const scene = new RingScene(canvas)
scene.onStationClick = (stationId) => {
  const level = game.snapshot.level.id
  if (level === "L1") game.predictOwner(stationId)
  if (level === "L2") game.predictLoser(stationId)
}
game.subscribe((state) => scene.sync(state, game.loads()))
mountHud(hudRoot, game)

window.__hashRing = { game }

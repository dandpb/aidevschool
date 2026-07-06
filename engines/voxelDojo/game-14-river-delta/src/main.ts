import { GameController } from "./game/controller"
import { DeltaScene } from "./scene/deltaScene"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __riverDelta?: { game: GameController }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController("L1")
const scene = new DeltaScene(canvas)
scene.onHeadwaterClick = (sourceId) => {
  const lvl = game.snapshot.level.id
  if (lvl === "L1") game.predictSource(sourceId)
  if (lvl === "L3") {
    if (game.snapshot.injectSource === null) game.injectDye(sourceId)
    else game.togglePredictedDyeSource(sourceId)
  }
}

game.subscribe((state) => scene.sync(state))
mountHud(hudRoot, game)

window.__riverDelta = { game }

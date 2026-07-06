import { GameController } from "./game/controller"
import { CheckpointScene } from "./scene/checkpointScene"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __checkpointCity?: { game: GameController }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController("L1")
const scene = new CheckpointScene(canvas)
scene.onGateClick = (target) => {
  const lvl = game.snapshot.level.id
  if (lvl === "L4") game.commitReorder(target)
  else game.predict(target)
}
game.subscribe((state) => scene.sync(state))
mountHud(hudRoot, game)

window.__checkpointCity = { game }

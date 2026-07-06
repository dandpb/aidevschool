import { GameController } from "./game/controller"
import { mountHud } from "./scene/hud"
import { PipelineScene } from "./scene/pipelineScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __pipelinePlant?: { game: GameController }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController("L1")
const scene = new PipelineScene(canvas)
scene.onTankClick = () => {
  const level = game.snapshot.level.id
  // clicking the tank toggles the current overflow/bounded prediction preview (L1/L2/L4 buffered)
  if (level === "L1" || level === "L4") game.predictOverflow(!game.bufferedOverflows())
}
game.subscribe((state) => scene.sync(state))
mountHud(hudRoot, game)

window.__pipelinePlant = { game }

import { GameController } from "./game/controller"
import { mountHud } from "./scene/hud"
import { LighthouseScene } from "./scene/lighthouseScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __lighthouseNetwork?: { game: GameController }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController("L1")
const scene = new LighthouseScene(canvas)
scene.onLighthouseClick = (nodeId) => {
  const level = game.snapshot.level.id
  if (level === "L1" || level === "L2") game.ackNode(nodeId)
  if (level === "L2") game.togglePredictedWatcher(nodeId)
  if (level === "L4") game.toggleSynced(nodeId)
}
game.subscribe((state) => scene.sync(state))
mountHud(hudRoot, game)

window.__lighthouseNetwork = { game }

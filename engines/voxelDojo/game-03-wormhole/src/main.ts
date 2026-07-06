import { GameController } from "./game/controller"
import { mountHud } from "./scene/hud"
import { WormholeScene } from "./scene/wormholeScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __wormhole?: { game: GameController }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController("L1")
const scene = new WormholeScene(canvas)
scene.onGateClick = () => {
  // Clicking the gate is a soft "confirm" affordance; the real input is the HUD field/buttons.
  void scene
}
game.subscribe((state) => scene.sync(state))
mountHud(hudRoot, game)

window.__wormhole = { game }

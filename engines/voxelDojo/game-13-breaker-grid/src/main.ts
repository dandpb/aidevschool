import { GameController } from "./game/controller"
import { BreakerScene } from "./scene/breakerScene"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __breakerGrid?: { game: GameController }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController("L1")
const scene = new BreakerScene(canvas)
scene.onDistrictClick = (districtId) => {
  game.selectDistrict(districtId)
}
game.subscribe((state) => scene.sync(state))
mountHud(hudRoot, game)

window.__breakerGrid = { game }

import { GameController } from "./game/controller"
import { mountHud } from "./scene/hud"
import { TowerScene } from "./scene/towerScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __timelineTower?: { game: GameController }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController("L1")
const scene = new TowerScene(canvas)

function render(): void {
  const state = game.snapshot
  scene.sync(state, game.truthStatus(), game.truthShipped() ? "shipped" : "none")
}

game.subscribe(() => render())
mountHud(hudRoot, game)
render()

window.__timelineTower = { game }

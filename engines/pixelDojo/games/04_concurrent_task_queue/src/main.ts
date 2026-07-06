import { GameController } from "./game/controller"
import { ForgeScene } from "./scene/forgeScene"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: deterministic controller + correct-action truth. */
    __taskForge?: {
      game: GameController
    }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController()
const scene = new ForgeScene(canvas)

// 3D interaction: click an ingot in the hopper → predict; click the rack →
// retry; click the scrap → DLQ. The HUD mirrors the same controller API.
scene.onIngotClick = (id) => game.predictIngot(id)
scene.onClassifyRetry = () => game.classifyRetry()
scene.onClassifyDlq = () => game.classifyDlq()

game.subscribe((state) => scene.sync(state))
mountHud(hudRoot, game)

// Keyboard: R = reject the inbound forklift (backpressure / idempotency).
// P = pause/resume (cosmetic; the wave is turn-based).
window.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") game.rejectArrival()
  if (e.key === "a" || e.key === "A") game.acceptArrival()
})

window.__taskForge = { game }

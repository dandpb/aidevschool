import { GameController } from "./game/controller"
import { AirScene } from "./scene/airScene"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __airTraffic?: { game: GameController }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController("L1")
const scene = new AirScene(canvas)
scene.onPadClick = (padId) => {
  if (game.snapshot.phase === "predicting") game.predictPad(padId)
}

// Sync the scene to sim state on every change; when probeFired flips true, flash the beams.
let lastProbeFired = false
game.subscribe((state) => {
  if (state.probeFired && !lastProbeFired) scene.flashProbes(state)
  lastProbeFired = state.probeFired
  scene.sync(state)
})

mountHud(hudRoot, game)

window.__airTraffic = { game }

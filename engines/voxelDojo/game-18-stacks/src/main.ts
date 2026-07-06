import { GameController } from "./game/controller"
import { mountHud } from "./scene/hud"
import { StacksScene } from "./scene/stacksScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __stacks?: { game: GameController }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController("L1")
const scene = new StacksScene(canvas)
scene.onShelfClick = (term) => {
  if (game.snapshot.level.id === "L1") game.fileCard(term)
}
scene.onBookClick = (docId) => {
  const lvl = game.snapshot.level.id
  if (lvl === "L2" || lvl === "L3") game.predictTop(docId)
  if (lvl === "L4") game.predictRank(docId)
}

game.subscribe((state) => scene.sync(state))
mountHud(hudRoot, game)

window.__stacks = { game }

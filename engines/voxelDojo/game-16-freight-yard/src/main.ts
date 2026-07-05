import { GameController } from "./game/controller"
import { FreightScene } from "./scene/freightScene"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __freightYard?: { game: GameController }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController("L1")
const scene = new FreightScene(canvas)

// Lane clicks drive L1 routing; car clicks drive L4 replay selection.
scene.onLaneClick = (partition) => {
  const level = game.snapshot.level.id
  if (level === "L1") game.predictRoute(partition)
}
scene.onCarClick = (partition, offset) => {
  const level = game.snapshot.level.id
  if (level === "L4") {
    // focus the rewind on this lane and toggle the offset as a predicted replay car
    game.toggleReplayOffset(offset)
    if (partition !== game.snapshot.replayPuzzle?.partition) return
  }
}

game.subscribe((state) => scene.sync(state))
mountHud(hudRoot, game)

window.__freightYard = { game }

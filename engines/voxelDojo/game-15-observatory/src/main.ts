import { GameController } from "./game/controller"
import { mountHud } from "./scene/hud"
import { ObservatoryScene } from "./scene/observatoryScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __observatory?: { game: GameController }
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage")
const hudRoot = document.querySelector<HTMLElement>("#hud")
if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

const game = new GameController("L1")
const scene = new ObservatoryScene(canvas)
scene.onBucketClick = (bucket) => {
  const lvl = game.snapshot.level.id
  if (lvl === "L1") game.predictBucket(bucket)
  if (lvl === "L2") game.predictPercentileBucket(bucket)
}
game.subscribe((state) => scene.sync(state))
mountHud(hudRoot, game)

window.__observatory = { game }

import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { mountHud } from "./scene/hud"
import { StacksScene } from "./scene/stacksScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __stacks?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, StacksScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new StacksScene(canvas),
  windowKey: "__stacks",
  mountHud,
  wireInteraction: (game, scene) => {
    scene.onShelfClick = (term) => {
      if (game.snapshot.level.id === "L1") game.fileCard(term)
    }
    scene.onBookClick = (docId) => {
      const lvl = game.snapshot.level.id
      if (lvl === "L2" || lvl === "L3") game.predictTop(docId)
      if (lvl === "L4") game.predictRank(docId)
    }
  },
  onState: (state, _game, scene) => scene.sync(state),
})

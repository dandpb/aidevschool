import { TeachingGameHostAdapter } from "@aidevschool/evidence/host-protocol"
import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { mountHud } from "./scene/hud"
import { WarehouseScene } from "./scene/warehouseScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __warehouse?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, WarehouseScene>({
  createGame: () => new GameController("L1"),
  createScene: (canvas) => new WarehouseScene(canvas),
  windowKey: "__warehouse",
  mountHud,
  wireInteraction: (game, scene) => {
    scene.onShelfClick = (shelf) => {
      // L1 — clicking a 3D shelf predicts the pending crate's hashed shelf.
      if (game.snapshot.level.id === "L1" && game.snapshot.phase === "predicting") {
        game.predictShelf(shelf)
      }
    }
  },
  onState: (state, game, scene) => scene.sync(state, game),
  hostedMission: {
    adapter: new TeachingGameHostAdapter({
      engineId: "voxelDojo",
      missionId: "game-02-warehouse",
      missionVersion: 1,
      unitId: "U2-key-value-store",
      engineVersion: "0.1.0",
      contentVersion: "game-02-warehouse@0.1.0",
    }),
    launch: (game) => {
      if (game.snapshot.phase === "briefing") game.start()
    },
    projectState: (state) => {
      if (state.phase === "cleared") {
        return { status: "completed", stage: "apply", progress: 1 }
      }
      if (state.phase === "failed") {
        return { status: "failed", stage: "apply", progress: 1 }
      }
      if (state.phase === "briefing") {
        return { status: "running", stage: "understand", progress: 0 }
      }
      const total = Math.max(1, state.keys.length)
      const completed = state.level.id === "L1" ? state.pendingIndex : state.crudIndex
      return {
        status: "running",
        stage: "respond",
        progress: Math.min(0.8, 0.2 + (completed / total) * 0.6),
      }
    },
  },
})

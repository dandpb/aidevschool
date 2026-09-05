import { TeachingGameHostAdapter } from "@aidevschool/evidence/host-protocol"
import type { MissionProjection } from "../../shared/projection"
import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { createCheckpointAccessibleProjection } from "./scene/accessible"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __checkpointCity?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, MissionProjection<GameState>>({
  createGame: () => new GameController("L1"),
  windowKey: "__checkpointCity",
  mountHud,
  renderer: {
    loadWebgl: async (canvas, game, hooks) => {
      const { CheckpointScene } = await import("./scene/checkpointScene")
      const scene = new CheckpointScene(canvas, hooks)
      scene.onGateClick = (target) => {
        const lvl = game.snapshot.level.id
        if (lvl === "L4") game.commitReorder(target)
        else game.predict(target)
      }
      return scene
    },
    createAccessible: (_target, game, controlsRoot) =>
      createCheckpointAccessibleProjection(game, controlsRoot),
  },
  hostedMission: {
    adapter: new TeachingGameHostAdapter({
      engineId: "voxelDojo",
      missionId: "game-07-checkpoint-city",
      missionVersion: 1,
      unitId: "U7-rest-api-auth",
      engineVersion: "0.1.0",
      contentVersion: "game-07-checkpoint-city@0.1.0",
    }),
    launch: (game) => {
      if (game.snapshot.phase === "briefing") game.start()
    },
    projectState: (state) => {
      if (state.phase === "cleared") return { status: "completed", stage: "apply", progress: 1 }
      if (state.phase === "failed") return { status: "failed", stage: "apply", progress: 1 }
      if (state.phase === "briefing") return { status: "running", stage: "understand", progress: 0 }
      if (state.phase === "resolving")
        return { status: "running", stage: "respond", progress: 0.75 }
      const wave = state.wave.length
      const progress = wave === 0 ? 0 : Math.min(1, state.predictions.length / wave)
      return { status: "running", stage: "respond", progress }
    },
  },
})

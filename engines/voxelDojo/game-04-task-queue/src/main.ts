import { TeachingGameHostAdapter } from "@aidevschool/evidence/host-protocol"
import type { MissionProjection } from "../../shared/projection"
import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { createTaskForgeAccessibleProjection } from "./scene/accessible"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __taskForge?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, MissionProjection<GameState>>({
  createGame: () => {
    const game = new GameController("L1")
    // plan §5 keyboard controls (R = reject inbound, P = pause) — registered
    // here so they work in standalone AND hosted boots.
    document.addEventListener("keydown", (e) => {
      if (e.key === "r" || e.key === "R") game.rejectInbound()
      if (e.key === "p" || e.key === "P") game.togglePause()
    })
    return game
  },
  windowKey: "__taskForge",
  mountHud,
  renderer: {
    loadWebgl: async (canvas, game, hooks) => {
      const { TaskForgeScene } = await import("./scene/taskForgeScene")
      const scene = new TaskForgeScene(canvas, hooks)
      scene.onIngotClick = (taskId) => game.predictDispatch(taskId)
      scene.onRackClick = () => game.classifyRetry()
      scene.onChuteClick = () => game.classifyDlq()
      return scene
    },
    createAccessible: (_target, game, controlsRoot) =>
      createTaskForgeAccessibleProjection(game, controlsRoot),
  },
  hostedMission: {
    adapter: new TeachingGameHostAdapter({
      engineId: "voxelDojo",
      missionId: "game-04-task-queue",
      missionVersion: 1,
      unitId: "U4-task-queue",
      engineVersion: "0.1.0",
      contentVersion: "game-04-task-queue@0.1.0",
    }),
    launch: (game) => {
      if (game.snapshot.phase === "briefing") game.start()
    },
    projectState: (state) => {
      if (state.phase === "cleared") return { status: "completed", stage: "apply", progress: 1 }
      if (state.phase === "failed") return { status: "failed", stage: "apply", progress: 1 }
      if (state.phase === "briefing") return { status: "running", stage: "understand", progress: 0 }
      const total = state.level.arrivals.length
      const resolved = state.succeededIds.length + state.dlqIds.length
      return {
        status: "running",
        stage: "respond",
        progress: Math.min(0.8, 0.2 + (resolved / Math.max(1, total)) * 0.6),
      }
    },
  },
})

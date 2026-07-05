import { curriculumUnitCount, firstCurriculumRegionId } from "../content/curriculumPack"
import { loadCorePack } from "../content/loadCorePack"
import type { RegionNpc } from "../content/types"
import type { EncounterAction } from "../game/encounters/encounterCore"
import {
  applyEncounterAction,
  autoPassEncounter,
  type EncounterState,
  isPolicyGateState,
  isRouteHealthState,
} from "../game/encounters/registry"
import { emitEvidence } from "../game/evidence/emitter"
import type { PixelQuestEvidenceRecord } from "../game/evidence/types"
import type { InputAction } from "../game/input/actions"
import { actionFromKey } from "../game/input/actions"
import { attachReviewContext } from "../game/review/reviewTrack"
import type { WorldState } from "../game/simulation/types"
import {
  createWorld,
  enterAuthGateDuel,
  enterCircuitBreakerDuel,
  enterDuel,
  enterJournal,
  enterPractice,
  enterRegion,
  enterSelectedSkillOrbitRegion,
  enterSkillOrbit,
  enterWorld,
  exitSkillOrbit,
  movePlayer,
  recordEvidence,
  selectSkillOrbit,
  setMode,
} from "../game/simulation/world"
import { WorldRenderer } from "../render/app/WorldRenderer"
import { Hud } from "../ui/Hud"
import { routeAction } from "./actionRouter"
import { runRouteCommand } from "./commandRunner"
import { buildEncounterHudState } from "./encounterHud"
import { applyInteractionFlow } from "./interactionFlow"
import { createEncounterForNpc, practiceHudForNpc } from "./lessonFlow"
import { currentEncounterId, findEncounter, skillOrbitHudParams, worldHudParams } from "./worldView"

export class PixelQuestApp {
  private readonly loaded = loadCorePack()
  private readonly renderer: WorldRenderer
  private readonly hud: Hud
  private world: WorldState = createWorld(this.loaded.pack, firstCurriculumRegionId())
  private activeNpc: RegionNpc | undefined
  private activeEncounter: EncounterState | undefined

  constructor(host: HTMLElement) {
    const shell = document.createElement("main")
    shell.className = "game-shell"
    host.append(shell)
    this.renderer = new WorldRenderer(shell, this.world)
    this.hud = new Hud(shell, {
      onStartQuest: () => this.startQuest(),
      onOpenSkillOrbit: () => this.openSkillOrbit(),
      onOrbitPrevious: () => this.stepSkillOrbit("previous"),
      onOrbitNext: () => this.stepSkillOrbit("next"),
      onSelectSkillOrbit: () => this.openSelectedSkillOrbitLab(),
      onOpenPractice: () => this.openPractice(),
      onStartEncounter: () => this.startEncounter(),
      onOpenJournal: () => this.openJournal(),
      onClosePanel: () => this.closePanel(),
      onAdmit: () => this.applyEncounterInput("admit"),
      onReject: () => this.applyEncounterInput("reject"),
    })
  }

  start(): void {
    window.addEventListener("keydown", this.onKeyDown)
    window.addEventListener("beforeunload", () => this.dispose())
    window.__pixelQuestDebug = {
      completeEncounter: () => this.completeEncounterForDebug(),
      enterRegion: (regionId: string) => this.enterRegionForDebug(regionId),
      getEvidence: () => window.__pixelQuestEvidence,
      getMode: () => this.world.mode,
      getPhase: () => this.world.progress.phase,
      getPlayerTile: () => this.world.player.position,
    }
    this.render()
    requestAnimationFrame(() => this.tick())
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown)
    this.renderer.dispose()
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const action = actionFromKey(event.key)
    if (action === undefined) {
      return
    }
    event.preventDefault()
    this.handleAction(action)
  }

  private tick(): void {
    this.renderer.sync(this.world)
    requestAnimationFrame(() => this.tick())
  }

  private handleAction(action: InputAction): void {
    const command = routeAction({
      action,
      mode: this.world.mode,
      encounterComplete: this.activeEncounter?.complete === true,
    })
    runRouteCommand(command, this)
  }

  startQuest(): void {
    this.world = enterWorld(this.world)
    this.render()
  }

  move(direction: "north" | "south" | "east" | "west"): void {
    this.world = movePlayer(this.world, direction)
    this.render()
  }

  openSkillOrbit(): void {
    this.world = enterSkillOrbit(this.world)
    this.renderSkillOrbit()
  }

  stepSkillOrbit(direction: "previous" | "next"): void {
    this.world = selectSkillOrbit(this.world, direction)
    this.renderSkillOrbit()
  }

  openSelectedSkillOrbitLab(): void {
    this.world = enterSelectedSkillOrbitRegion(this.world)
    this.render()
  }

  interact(): void {
    const result = applyInteractionFlow(this.world, this.loaded.dialogues)
    if (result.kind === "dialogue") {
      this.activeNpc = result.npc
      this.world = result.world
      this.hud.showDialogue(result.npc.name, result.dialogue)
    } else if (result.kind === "region") {
      this.activeNpc = undefined
      this.activeEncounter = undefined
      this.world = result.world
      this.render()
    } else if (result.kind === "gate-message") {
      this.world = result.world
      this.hud.showGateMessage(result.label)
    }
  }

  openPractice(): void {
    const params = practiceHudForNpc(
      this.activeNpc,
      this.loaded.pack.encounters,
      this.world.progress.reviewTrack,
    )
    if (params === undefined) {
      return
    }
    this.world = enterPractice(this.world)
    this.hud.showPractice(params)
  }

  startEncounter(): void {
    const encounter = createEncounterForNpc(this.activeNpc, this.loaded.pack.encounters)
    if (encounter === undefined) {
      return
    }
    this.activeEncounter = encounter
    const isCircuitBreaker = encounter.definition.kind === "route_health"
    const isAuthGate = encounter.definition.kind === "policy_gate"
    this.world = isCircuitBreaker
      ? enterCircuitBreakerDuel(this.world)
      : isAuthGate
        ? enterAuthGateDuel(this.world)
        : enterDuel(this.world)
    if (isCircuitBreaker && isRouteHealthState(encounter)) {
      this.renderer.setCircuitBreakerEncounter(encounter)
    }
    if (isAuthGate && isPolicyGateState(encounter)) {
      this.renderer.setAuthGateEncounter(encounter)
    }
    this.renderEncounter()
  }

  applyEncounterInput(action: EncounterAction): void {
    if (this.activeEncounter === undefined || this.activeEncounter.complete) {
      return
    }
    this.activeEncounter = applyEncounterAction(this.activeEncounter, action, new Date())
    if (this.world.mode === "circuit-breaker") {
      const current = this.activeEncounter
      if (isRouteHealthState(current)) {
        this.renderer.setCircuitBreakerEncounter(current)
      }
    }
    if (this.world.mode === "auth-gate") {
      const current = this.activeEncounter
      if (isPolicyGateState(current)) {
        this.renderer.setAuthGateEncounter(current)
      }
    }
    const evidence = this.activeEncounter.evidence
    if (evidence !== undefined) {
      this.world = recordEvidence(this.world, this.publishEvidence(evidence))
    }
    this.renderEncounter()
  }

  openJournal(): void {
    this.world = enterJournal(this.world)
    this.hud.showJournal(this.world.progress.latestEvidence, this.world.progress.reviewTrack)
    this.renderer.sync(this.world)
  }

  openHelp(): void {
    this.world = setMode(this.world, "help")
    this.hud.showHelp(this.world.progress.phase)
    this.renderer.sync(this.world)
  }

  closePanel(): void {
    this.activeNpc = undefined
    this.activeEncounter = undefined
    if (this.world.mode === "circuit-breaker") {
      this.renderer.setCircuitBreakerEncounter(undefined)
    }
    if (this.world.mode === "auth-gate") {
      this.renderer.setAuthGateEncounter(undefined)
    }
    this.world =
      this.world.mode === "skill-orbit" ? exitSkillOrbit(this.world) : enterWorld(this.world)
    this.render()
  }

  private render(): void {
    if (this.world.mode === "skill-orbit") {
      this.renderSkillOrbit()
      return
    }
    if (this.world.mode === "briefing") {
      this.hud.showBriefing(this.world.progress.reviewTrack, curriculumUnitCount())
      this.renderer.sync(this.world)
      return
    }
    this.hud.renderWorld(worldHudParams(this.world, this.loaded.pack.encounters))
    this.renderer.sync(this.world)
  }

  private renderSkillOrbit(): void {
    this.hud.showSkillOrbit(skillOrbitHudParams(this.world, curriculumUnitCount()))
    this.renderer.sync(this.world)
  }

  private renderEncounter(): void {
    const state = buildEncounterHudState(this.activeEncounter)
    if (state === undefined) {
      return
    }
    this.hud.showEncounter(state)
    this.renderer.sync(this.world)
  }

  private completeEncounterForDebug(): PixelQuestEvidenceRecord {
    const encounter = findEncounter(this.loaded.pack.encounters, currentEncounterId(this.world))
    this.activeEncounter = autoPassEncounter(encounter, new Date())
    const evidence = this.activeEncounter.evidence
    if (evidence === undefined) {
      throw new Error("Auto-pass did not produce evidence")
    }
    const validEvidence = this.publishEvidence(evidence)
    this.world = recordEvidence(enterWorld(this.world), validEvidence)
    this.render()
    return validEvidence
  }

  private enterRegionForDebug(regionId: string): void {
    this.activeNpc = undefined
    this.activeEncounter = undefined
    this.world = enterRegion(this.world, regionId)
    this.render()
  }

  // Single emission point: attach the review projection, then hand off to the
  // typed emitter (validate + append to window channel + EVIDENCE console line).
  private publishEvidence(evidence: PixelQuestEvidenceRecord): PixelQuestEvidenceRecord {
    return emitEvidence(attachReviewContext(evidence, this.world.progress.reviewTrack))
  }
}

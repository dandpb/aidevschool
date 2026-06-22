import { curriculumUnitCount, firstCurriculumRegionId } from "../content/curriculumPack"
import { loadCorePack } from "../content/loadCorePack"
import type { EncounterDefinition, RegionNpc } from "../content/types"
import {
  applyEncounterAction,
  autoPassEncounter,
  createEncounterFromPack,
  type EncounterState,
  encounterProgress,
  getCurrentPrompt,
} from "../game/encounters/registry"
import type { EncounterAction } from "../game/encounters/tokenBucket"
import { validateEvidenceRecord } from "../game/evidence/evidence"
import type { PixelQuestEvidenceRecord } from "../game/evidence/types"
import type { InputAction } from "../game/input/actions"
import { actionFromKey } from "../game/input/actions"
import { attachReviewContext } from "../game/review/reviewTrack"
import type { WorldState } from "../game/simulation/types"
import {
  createWorld,
  enterDuel,
  enterGate,
  enterJournal,
  enterPractice,
  enterRegion,
  enterWorld,
  getInteraction,
  isUnitCompleted,
  movePlayer,
  recordEvidence,
  setMode,
} from "../game/simulation/world"
import { WorldRenderer } from "../render/app/WorldRenderer"
import { Hud } from "../ui/Hud"
import { type RouteCommand, routeAction } from "./actionRouter"

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
    this.runCommand(
      routeAction({
        action,
        mode: this.world.mode,
        encounterComplete: this.activeEncounter?.complete === true,
      }),
    )
  }

  private runCommand(command: RouteCommand): void {
    if (command.kind === "move") {
      this.world = movePlayer(this.world, command.action.direction)
      this.render()
    } else if (command.kind === "apply-encounter") {
      this.applyEncounterInput(command.action)
    } else if (command.kind === "start-quest") {
      this.startQuest()
    } else if (command.kind === "interact") {
      this.interact()
    } else if (command.kind === "open-help") {
      this.openHelp()
    } else if (command.kind === "open-journal") {
      this.openJournal()
    } else if (command.kind === "open-practice") {
      this.openPractice()
    } else if (command.kind === "start-encounter") {
      this.startEncounter()
    } else if (command.kind === "close-panel") {
      this.closePanel()
    }
  }

  private startQuest(): void {
    this.world = enterWorld(this.world)
    this.render()
  }

  private interact(): void {
    const interaction = getInteraction(this.world)
    if (interaction.kind === "npc") {
      this.activeNpc = interaction.npc
      this.world = setMode(this.world, "dialogue")
      const dialogue = this.loaded.dialogues[interaction.npc.dialogueRef] ?? ""
      this.hud.showDialogue(interaction.npc.name, dialogue)
    } else if (interaction.kind === "gate") {
      if (interaction.unlocked && interaction.gate.nextRegionId !== undefined) {
        this.activeNpc = undefined
        this.activeEncounter = undefined
        this.world = enterRegion(this.world, interaction.gate.nextRegionId)
        this.render()
        return
      }
      this.world = enterGate(this.world)
      this.hud.showGateMessage(
        interaction.unlocked ? interaction.gate.unlockedLabel : interaction.gate.lockedLabel,
      )
    }
  }

  private openPractice(): void {
    if (this.activeNpc === undefined) {
      return
    }
    const encounter = this.getEncounterDefinition(this.activeNpc.encounterId)
    this.world = enterPractice(this.world)
    this.hud.showPractice({
      reviewTrack: this.world.progress.reviewTrack,
      title: encounter.title,
      practiceTitle: encounter.practiceTitle,
      practiceText: encounter.practiceText,
      admitActionLabel: encounter.admitActionLabel,
      rejectActionLabel: encounter.rejectActionLabel,
    })
  }

  private startEncounter(): void {
    if (this.activeNpc === undefined) {
      return
    }
    const encounter = this.getEncounterDefinition(this.activeNpc.encounterId)
    this.activeEncounter = createEncounterFromPack(encounter)
    this.world = enterDuel(this.world)
    this.renderEncounter()
  }

  private applyEncounterInput(action: EncounterAction): void {
    if (this.activeEncounter === undefined || this.activeEncounter.complete) {
      return
    }
    this.activeEncounter = applyEncounterAction(this.activeEncounter, action, new Date())
    const evidence = this.activeEncounter.evidence
    if (evidence !== undefined) {
      this.world = recordEvidence(this.world, this.publishEvidence(evidence))
    }
    this.renderEncounter()
  }

  private openJournal(): void {
    this.world = enterJournal(this.world)
    this.hud.showJournal(this.world.progress.latestEvidence, this.world.progress.reviewTrack)
    this.renderer.sync(this.world)
  }

  private openHelp(): void {
    this.world = setMode(this.world, "help")
    this.hud.showHelp(this.world.progress.phase)
    this.renderer.sync(this.world)
  }

  private closePanel(): void {
    this.activeNpc = undefined
    this.activeEncounter = undefined
    this.world = enterWorld(this.world)
    this.render()
  }

  private render(): void {
    if (this.world.mode === "briefing") {
      this.hud.showBriefing(this.world.progress.reviewTrack, curriculumUnitCount())
      this.renderer.sync(this.world)
      return
    }
    const interaction = getInteraction(this.world)
    const prompt =
      interaction.kind === "npc"
        ? "E: falar | J: diario | H: fases"
        : interaction.kind === "gate"
          ? "E: inspecionar gate | J: diario | H: fases"
          : "Setas/WASD: mover | J: diario | H: fases"
    this.hud.renderWorld({
      objective: this.currentObjectiveText(),
      completed: isUnitCompleted(this.world, this.currentUnitId()),
      phase: this.world.progress.phase,
      prompt,
      reviewTrack: this.world.progress.reviewTrack,
      latestEvidence: this.world.progress.latestEvidence,
    })
    this.renderer.sync(this.world)
  }

  private renderEncounter(): void {
    if (this.activeEncounter === undefined) {
      return
    }
    const progress = encounterProgress(this.activeEncounter)
    this.hud.showEncounter({
      title: this.activeEncounter.definition.title,
      mechanicName: this.activeEncounter.definition.mechanicName,
      resourceName: this.activeEncounter.definition.resourceName,
      goodRequestLabel: this.activeEncounter.definition.goodRequestLabel,
      badRequestLabel: this.activeEncounter.definition.badRequestLabel,
      admitActionLabel: this.activeEncounter.definition.admitActionLabel,
      rejectActionLabel: this.activeEncounter.definition.rejectActionLabel,
      prompt: getCurrentPrompt(this.activeEncounter),
      index: progress.index,
      total: progress.total,
      resourceValue: progress.resourceValue,
      heatPeak: progress.heatPeak,
      complete: this.activeEncounter.complete,
      evidence: this.activeEncounter.evidence,
    })
    this.renderer.sync(this.world)
  }

  private completeEncounterForDebug(): PixelQuestEvidenceRecord {
    const encounter = this.getEncounterDefinition(this.currentEncounterId())
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

  private currentObjectiveText(): string {
    const unit = this.loaded.pack.units.find(
      (candidate) => candidate.unit_id === this.currentUnitId(),
    )
    if (unit === undefined) {
      return this.world.region.name
    }
    return `${this.world.region.name}: ${unit.concept}`
  }

  private currentUnitId(): string {
    const npc = this.world.region.npcs[0]
    if (npc === undefined) {
      throw new Error(`Region ${this.world.region.id} has no mentor`)
    }
    const encounter = this.getEncounterDefinition(npc.encounterId)
    return encounter.unit_id
  }

  private currentEncounterId(): string {
    const npc = this.world.region.npcs[0]
    if (npc === undefined) {
      throw new Error(`Region ${this.world.region.id} has no mentor`)
    }
    return npc.encounterId
  }

  private getEncounterDefinition(encounterId: string): EncounterDefinition {
    const encounter = this.loaded.pack.encounters.find((candidate) => candidate.id === encounterId)
    if (encounter === undefined) {
      throw new Error(`Unknown encounter ${encounterId}`)
    }
    return encounter
  }

  private publishEvidence(evidence: PixelQuestEvidenceRecord): PixelQuestEvidenceRecord {
    const validEvidence = validateEvidenceRecord(
      attachReviewContext(evidence, this.world.progress.reviewTrack),
    )
    window.__pixelQuestEvidence = validEvidence
    return validEvidence
  }
}

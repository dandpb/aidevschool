import "./styles.css"
import { loadCorePack } from "./content/loadCorePack"
import type { EncounterDefinition, RegionNpc } from "./content/types"
import { createEncounterFromPack } from "./game/encounters/registry"
import type { EncounterAction, TokenBucketEncounterState } from "./game/encounters/tokenBucket"
import {
  applyEncounterAction,
  autoPassEncounter,
  getCurrentRequest,
} from "./game/encounters/tokenBucket"
import { validateEvidenceRecord } from "./game/evidence/evidence"
import type { PixelQuestEvidenceRecord } from "./game/evidence/types"
import type { InputAction } from "./game/input/actions"
import { actionFromKey } from "./game/input/actions"
import type { WorldState } from "./game/simulation/types"
import {
  createWorld,
  getInteraction,
  isUnitCompleted,
  movePlayer,
  recordEvidence,
  setMode,
} from "./game/simulation/world"
import { WorldRenderer } from "./render/app/WorldRenderer"
import { Hud } from "./ui/Hud"

const app = document.querySelector<HTMLDivElement>("#app")

if (app === null) {
  throw new Error("Missing #app root")
}

const shell = document.createElement("main")
shell.className = "game-shell"
app.append(shell)

const loaded = loadCorePack()
let world: WorldState = createWorld(loaded.pack, "rate-limiter-lab")
let activeNpc: RegionNpc | undefined
let activeEncounter: TokenBucketEncounterState | undefined

const renderer = new WorldRenderer(shell, world)
const hud = new Hud(shell, {
  onStartEncounter: () => startEncounterFromNpc(),
  onClosePanel: () => closePanel(),
  onAdmit: () => applyEncounterInput("admit"),
  onReject: () => applyEncounterInput("reject"),
})

window.addEventListener("keydown", (event) => {
  const action = actionFromKey(event.key)
  if (action === undefined) {
    return
  }
  event.preventDefault()
  handleAction(action)
})

window.addEventListener("beforeunload", () => renderer.dispose())

window.__pixelQuestDebug = {
  completeEncounter: () => {
    const encounter = getEncounterDefinition("encounter-token-bucket-01")
    activeEncounter = autoPassEncounter(encounter, new Date())
    const evidence = activeEncounter.evidence
    if (evidence === undefined) {
      throw new Error("Auto-pass did not produce evidence")
    }
    publishEvidence(evidence)
    world = recordEvidence(setMode(world, "world"), evidence)
    render()
    return evidence
  },
  getEvidence: () => window.__pixelQuestEvidence,
  getMode: () => world.mode,
  getPlayerTile: () => world.player.position,
}

render()
requestAnimationFrame(tick)

function tick(): void {
  renderer.sync(world)
  requestAnimationFrame(tick)
}

function handleAction(action: InputAction): void {
  if (world.mode === "encounter") {
    if (action.kind === "admit") {
      applyEncounterInput("admit")
    } else if (action.kind === "reject") {
      applyEncounterInput("reject")
    } else if (action.kind === "confirm" && activeEncounter?.complete === true) {
      closePanel()
    } else if (action.kind === "cancel") {
      closePanel()
    }
    return
  }
  if (world.mode === "dialogue") {
    if (action.kind === "confirm") {
      startEncounterFromNpc()
    } else if (action.kind === "cancel") {
      closePanel()
    }
    return
  }
  if (world.mode === "journal") {
    if (action.kind === "confirm" || action.kind === "cancel" || action.kind === "journal") {
      closePanel()
    }
    return
  }
  if (action.kind === "move") {
    world = movePlayer(world, action.direction)
    render()
  } else if (action.kind === "confirm") {
    interact()
  } else if (action.kind === "journal") {
    world = setMode(world, "journal")
    hud.showJournal(world.progress.latestEvidence)
    renderer.sync(world)
  }
}

function interact(): void {
  const interaction = getInteraction(world)
  if (interaction.kind === "npc") {
    activeNpc = interaction.npc
    world = setMode(world, "dialogue")
    const dialogue = loaded.dialogues[interaction.npc.dialogueRef] ?? ""
    hud.showDialogue(interaction.npc.name, dialogue)
  } else if (interaction.kind === "gate") {
    world = setMode(world, "dialogue")
    hud.showGateMessage(
      interaction.unlocked ? interaction.gate.unlockedLabel : interaction.gate.lockedLabel,
    )
  }
}

function startEncounterFromNpc(): void {
  if (activeNpc === undefined) {
    return
  }
  const encounter = getEncounterDefinition(activeNpc.encounterId)
  activeEncounter = createEncounterFromPack(encounter)
  world = setMode(world, "encounter")
  renderEncounter()
}

function applyEncounterInput(action: EncounterAction): void {
  if (activeEncounter === undefined || activeEncounter.complete) {
    return
  }
  activeEncounter = applyEncounterAction(activeEncounter, action, new Date())
  const evidence = activeEncounter.evidence
  if (evidence !== undefined) {
    publishEvidence(evidence)
    world = recordEvidence(world, evidence)
  }
  renderEncounter()
}

function closePanel(): void {
  activeNpc = undefined
  activeEncounter = undefined
  world = setMode(world, "world")
  render()
}

function render(): void {
  const interaction = getInteraction(world)
  const completed = isUnitCompleted(world, "U0-sonda-rate-limiter-robustness")
  const prompt =
    interaction.kind === "npc"
      ? "E: falar | J: diario"
      : interaction.kind === "gate"
        ? "E: inspecionar gate | J: diario"
        : "Setas/WASD: mover | J: diario"
  hud.renderWorld({
    completed,
    prompt,
    latestEvidence: world.progress.latestEvidence,
  })
  renderer.sync(world)
}

function renderEncounter(): void {
  if (activeEncounter === undefined) {
    return
  }
  hud.showEncounter({
    title: activeEncounter.definition.title,
    request: getCurrentRequest(activeEncounter),
    index: activeEncounter.index,
    total: activeEncounter.definition.requests.length,
    tokens: activeEncounter.tokens,
    heatPeak: activeEncounter.heatPeak,
    complete: activeEncounter.complete,
    evidence: activeEncounter.evidence,
  })
  renderer.sync(world)
}

function getEncounterDefinition(encounterId: string): EncounterDefinition {
  const encounter = loaded.pack.encounters.find((candidate) => candidate.id === encounterId)
  if (encounter === undefined) {
    throw new Error(`Unknown encounter ${encounterId}`)
  }
  return encounter
}

function publishEvidence(evidence: PixelQuestEvidenceRecord): void {
  const validEvidence = validateEvidenceRecord(evidence)
  window.__pixelQuestEvidence = validEvidence
}

import {
  type EncounterState,
  encounterProgress,
  getCurrentPrompt,
} from "../game/encounters/registry"
import type { EncounterHudState } from "../ui/Hud"

export function buildEncounterHudState(
  activeEncounter: EncounterState | undefined,
): EncounterHudState | undefined {
  if (activeEncounter === undefined) {
    return undefined
  }
  const progress = encounterProgress(activeEncounter)
  return {
    title: activeEncounter.definition.title,
    mechanicName: activeEncounter.definition.mechanicName,
    resourceName: activeEncounter.definition.resourceName,
    goodRequestLabel: activeEncounter.definition.goodRequestLabel,
    badRequestLabel: activeEncounter.definition.badRequestLabel,
    admitActionLabel: activeEncounter.definition.admitActionLabel,
    rejectActionLabel: activeEncounter.definition.rejectActionLabel,
    prompt: getCurrentPrompt(activeEncounter),
    index: progress.index,
    total: progress.total,
    resourceValue: progress.resourceValue,
    heatPeak: progress.heatPeak,
    complete: activeEncounter.complete,
    evidence: activeEncounter.evidence,
  }
}

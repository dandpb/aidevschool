import type { EncounterDefinition, RegionNpc } from "../content/types"
import { createEncounterFromPack, type EncounterState } from "../game/encounters/registry"
import type { ReviewTrack } from "../game/review/types"

export type PracticeHudParams = {
  readonly reviewTrack: ReviewTrack
  readonly title: string
  readonly practiceTitle: string
  readonly practiceText: string
  readonly admitActionLabel: string
  readonly rejectActionLabel: string
}

export function practiceHudForNpc(
  npc: RegionNpc | undefined,
  encounters: readonly EncounterDefinition[],
  reviewTrack: ReviewTrack,
): PracticeHudParams | undefined {
  const encounter = encounterForNpc(npc, encounters)
  if (encounter === undefined) {
    return undefined
  }
  return {
    reviewTrack,
    title: encounter.title,
    practiceTitle: encounter.practiceTitle,
    practiceText: encounter.practiceText,
    admitActionLabel: encounter.admitActionLabel,
    rejectActionLabel: encounter.rejectActionLabel,
  }
}

export function createEncounterForNpc(
  npc: RegionNpc | undefined,
  encounters: readonly EncounterDefinition[],
): EncounterState | undefined {
  const encounter = encounterForNpc(npc, encounters)
  return encounter === undefined ? undefined : createEncounterFromPack(encounter)
}

function encounterForNpc(
  npc: RegionNpc | undefined,
  encounters: readonly EncounterDefinition[],
): EncounterDefinition | undefined {
  return npc === undefined
    ? undefined
    : encounters.find((encounter) => encounter.id === npc.encounterId)
}

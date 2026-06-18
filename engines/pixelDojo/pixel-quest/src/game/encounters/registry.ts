import type { EncounterDefinition } from "../../content/types"
import { createTokenBucketState, type TokenBucketEncounterState } from "./tokenBucket"

export type EncounterState = TokenBucketEncounterState

export function createEncounterFromPack(definition: EncounterDefinition): EncounterState {
  switch (definition.kind) {
    case "token_bucket":
      return createTokenBucketState(definition)
  }
}

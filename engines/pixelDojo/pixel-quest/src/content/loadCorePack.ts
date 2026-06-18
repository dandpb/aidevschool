import { coreDialogues } from "./dialogues"
import corePackData from "./packs/core/pack.json"
import { validateContentPack } from "./packValidator"
import type { LoadedContentPack } from "./types"

export function loadCorePack(): LoadedContentPack {
  const pack = validateContentPack(corePackData)
  return {
    pack,
    dialogues: coreDialogues,
  }
}

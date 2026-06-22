import { curriculumDialogues, curriculumPack } from "./curriculumPack"
import { validateContentPack } from "./packValidator"
import type { LoadedContentPack } from "./types"

export function loadCorePack(): LoadedContentPack {
  const pack = validateContentPack(curriculumPack)
  return {
    pack,
    dialogues: curriculumDialogues,
  }
}

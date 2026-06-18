import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = resolve(__dirname, "..", "..", "..")
const orchestrationPaths = [
  "engines/miniMaxEvolutionEngine/.claude/commands/devschool/",
  "engines/miniMaxEvolutionEngine/CLAUDE.md",
  "engines/miniMaxEvolutionEngine/.claude/commands/devschool/phaserunner.md",
  ".mavis/plans/plan.yaml",
] as const

describe("orchestration boundary links", () => {
  for (const workspacePath of orchestrationPaths) {
    it(`exists: ${workspacePath}`, () => {
      expect(existsSync(resolve(repoRoot, workspacePath))).toBe(true)
    })
  }
})

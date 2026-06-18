import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = resolve(__dirname, "..", "..", "..")
const manifestPath = join(repoRoot, "engines", "codexDojo", "ecosystem", "MANIFEST.md")
const manifest = readFileSync(manifestPath, "utf8")

const statusLabels = ["implemented", "scaffolded", "planned", "proposal", "blocked"] as const

function extractSection(manifestText: string, heading: string): string {
  const startMarker = `## ${heading}\n`
  const startIndex = manifestText.indexOf(startMarker)

  if (startIndex === -1) {
    throw new Error(`Missing ## ${heading} section in MANIFEST.md`)
  }

  const sectionBody = manifestText.slice(startIndex + startMarker.length)
  const nextHeadingIndex = sectionBody.indexOf("\n## ")

  return nextHeadingIndex === -1 ? sectionBody : sectionBody.slice(0, nextHeadingIndex)
}

function extractWorkspacePaths(tableSection: string): string[] {
  const paths: string[] = []

  for (const line of tableSection.split("\n")) {
    if (!line.startsWith("|")) {
      continue
    }

    for (const match of line.matchAll(/`([^`]+)`/g)) {
      const entry = match[1]

      if (entry === undefined) {
        continue
      }

      if (!entry.includes("/")) {
        continue
      }

      if (!/(?:\.md|\.ya?ml|\.json|\/)$/u.test(entry)) {
        continue
      }

      paths.push(entry)
    }
  }

  return paths
}

describe("codexDojo MANIFEST coverage", () => {
  it("declares the shared status vocabulary", () => {
    const statusVocabularySection = extractSection(manifest, "Status Vocabulary")

    for (const label of statusLabels) {
      expect(statusVocabularySection).toContain(`\`${label}\``)
    }
  })

  it("references existing paths in coverage tables", () => {
    const coverageSections = [
      extractSection(manifest, "Requested Deliverables Coverage"),
      extractSection(manifest, "Requested Scope Coverage"),
    ]

    const workspacePaths = [
      ...new Set(coverageSections.flatMap((section) => extractWorkspacePaths(section))),
    ]

    expect(workspacePaths.length).toBeGreaterThan(0)

    for (const workspacePath of workspacePaths) {
      if (workspacePath.startsWith("docs/PROMPTS/")) {
        continue
      }

      const absolutePath = resolve(repoRoot, workspacePath)
      expect(
        existsSync(absolutePath),
        `Expected ${workspacePath} to exist relative to repo root`,
      ).toBe(true)
    }
  })
})

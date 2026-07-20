import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { buildInitialState } from "../state"
import { renderLinuxLab } from "./index"

const sourceRoot = new URL("..", import.meta.url)

describe("linuxLab module boundary", () => {
  it("is a bridge-only module (no app catalog)", () => {
    expect(existsSync(fileURLToPath(new URL("linuxLab/catalog.ts", sourceRoot)))).toBe(false)
    expect(existsSync(fileURLToPath(new URL("data/linuxApps.ts", sourceRoot)))).toBe(false)
    expect(existsSync(fileURLToPath(new URL("render/linuxLab.ts", sourceRoot)))).toBe(false)
  })

  it("renders only the OS launch bridge", () => {
    const html = renderLinuxLab(buildInitialState("a", "s"))
    expect(html).toContain("Linux Lab")
    expect(html).toContain("os-engine-bridge")
    expect(html).not.toContain("linux-app-tile")
    expect(html).not.toContain("run-linux-lab")
  })
})

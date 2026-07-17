import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { getLinuxApp, getLinuxAppsForCategory, linuxApps, renderLinuxLab } from "./index"

describe("Linux Lab module boundary", () => {
  it("exposes the compatibility catalog and renderer from one public entry point", () => {
    expect(linuxApps.length).toBeGreaterThanOrEqual(50)
    expect(getLinuxApp("terminal").name).toBe("Terminal")
    expect(typeof renderLinuxLab).toBe("function")
  })

  it("owns the catalog and renderer instead of leaving legacy files behind", () => {
    const sourceRoot = new URL("../", import.meta.url)

    expect(existsSync(fileURLToPath(new URL("data/linuxApps.ts", sourceRoot)))).toBe(false)
    expect(existsSync(fileURLToPath(new URL("render/linuxLab.ts", sourceRoot)))).toBe(false)
  })

  it("reuses cached category groups without allocating on each query", () => {
    const developerApps = getLinuxAppsForCategory("development")

    expect(developerApps).toBe(getLinuxAppsForCategory("development"))
    expect(Object.isFrozen(developerApps)).toBe(true)
    expect(developerApps.every((app) => app.category === "development")).toBe(true)
  })
})

// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"

vi.mock("./data/agents", () => ({
  agents: [],
}))

vi.mock("./data/cycle", () => ({
  cycleStages: [],
  cycleStageIndexById: new Map(),
}))

vi.mock("./progress", async () => {
  const actual = await vi.importActual<typeof import("./progress")>("./progress")
  return { ...actual, getProjects: () => [] }
})

import { AppMountError, mountCodexDojo } from "./app"

describe("mountCodexDojo with empty catalogs", () => {
  it("throws AppMountError", () => {
    const root = {} as HTMLElement
    expect(() => mountCodexDojo(root)).toThrow(AppMountError)
  })
})

import { describe, expect, it, vi } from "vitest"

vi.mock("./progress", () => ({
  getAgents: vi.fn(() => []),
  getStages: vi.fn(() => []),
}))

import { AppMountError, mountCodexDojo } from "./app"

describe("mountCodexDojo", () => {
  it("throws AppMountError when agents or stages are empty", () => {
    const root = {} as HTMLElement
    expect(() => mountCodexDojo(root)).toThrow(AppMountError)
  })
})

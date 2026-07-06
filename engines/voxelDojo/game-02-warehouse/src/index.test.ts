import { describe, expect, it } from "vitest"
import { bucketOf, GameController, keysFor, levelConfig, put } from "."
import { createStore } from "./sim/store"

describe("warehouse module entry", () => {
  it("exposes the headless warehouse controller and sim helpers", () => {
    const game = new GameController("L1")
    const store = createStore<string>(8)
    put(store, "user:42:cart", "v1", () => 0)

    expect(game.snapshot.level.id).toBe("L1")
    expect(bucketOf("user:42:cart", 8)).toBe(bucketOf("user:42:cart", 8))
    expect(store.entries.get("user:42:cart")?.value).toBe("v1")
  })

  it("keysFor + levelConfig are deterministic", () => {
    const cfg = levelConfig("L1")
    const a = keysFor(cfg)
    const b = keysFor(cfg)
    expect(a).toEqual(b)
  })
})

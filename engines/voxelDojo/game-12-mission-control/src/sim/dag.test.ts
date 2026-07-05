import { describe, expect, it } from "vitest"
import {
  allDone,
  canLaunch,
  hasCycle,
  type Job,
  layers,
  missingDeps,
  readyJobs,
  topoOrder,
} from "./dag"

// diamond: A → {B,C} → D  (two layers of deps above the root)
const DIAMOND: Job[] = [
  { id: "A", deps: [] },
  { id: "B", deps: ["A"] },
  { id: "C", deps: ["A"] },
  { id: "D", deps: ["B", "C"] },
]

describe("topological order", () => {
  it("respects dependencies: every dep launches strictly before its dependent", () => {
    const order = topoOrder(DIAMOND)
    const pos = new Map(order.map((id, i) => [id, i]))
    expect(order).toHaveLength(DIAMOND.length)
    for (const job of DIAMOND) {
      for (const dep of job.deps) {
        expect(pos.get(dep)).toBeLessThan(pos.get(job.id) as number)
      }
    }
    expect(order[order.length - 1]).toBe("D") // D is the sink — launches last
    expect(order[0]).toBe("A") // A is the root — launches first
  })

  it("is deterministic: same job list ⇒ identical order", () => {
    expect(topoOrder(DIAMOND)).toEqual(topoOrder(DIAMOND))
  })

  it("handles independent roots in insertion order", () => {
    const jobs: Job[] = [
      { id: "x", deps: [] },
      { id: "y", deps: [] },
      { id: "z", deps: [] },
    ]
    expect(topoOrder(jobs)).toEqual(["x", "y", "z"])
  })
})

describe("cycle detection", () => {
  it("throws on a direct cycle", () => {
    expect(() =>
      topoOrder([
        { id: "a", deps: ["b"] },
        { id: "b", deps: ["a"] },
      ]),
    ).toThrow("cycle")
  })

  it("throws on a self-loop", () => {
    expect(() => topoOrder([{ id: "a", deps: ["a"] }])).toThrow("cycle")
  })

  it("hasCycle flags the back-edge without throwing", () => {
    expect(
      hasCycle([
        { id: "a", deps: ["b"] },
        { id: "b", deps: ["c"] },
        { id: "c", deps: ["a"] },
      ]),
    ).toBe(true)
    expect(hasCycle(DIAMOND)).toBe(false)
  })

  it("throws on a missing dependency", () => {
    expect(() => topoOrder([{ id: "a", deps: ["ghost"] }])).toThrow("missing")
    expect(missingDeps([{ id: "a", deps: ["ghost"] }]).get("a")).toEqual(["ghost"])
  })
})

describe("readyJobs", () => {
  it("at the start only the root(s) are ready; blocked jobs are excluded", () => {
    const ready = readyJobs(new Set(), DIAMOND).map((j) => j.id)
    expect(ready).toEqual(["A"])
    // B/C/D are all blocked by something not yet completed
    expect(canLaunch(new Set(), DIAMOND[1] as Job)).toBe(false)
  })

  it("completing the root unblocks the middle layer, then the sink", () => {
    expect(
      readyJobs(new Set(["A"]), DIAMOND)
        .map((j) => j.id)
        .sort(),
    ).toEqual(["B", "C"])
    expect(readyJobs(new Set(["A", "B"]), DIAMOND).map((j) => j.id)).toEqual(["C"])
    expect(readyJobs(new Set(["A", "B", "C"]), DIAMOND).map((j) => j.id)).toEqual(["D"])
  })

  it("a fully completed DAG has no ready jobs and allDone is true", () => {
    const done = new Set(["A", "B", "C", "D"])
    expect(readyJobs(done, DIAMOND)).toHaveLength(0)
    expect(allDone(done, DIAMOND)).toBe(true)
  })

  it("layers give the root depth 0 and the sink the deepest layer", () => {
    const l = layers(DIAMOND)
    expect(l.get("A")).toBe(0)
    expect(l.get("B")).toBe(1)
    expect(l.get("C")).toBe(1)
    expect(l.get("D")).toBe(2)
  })
})

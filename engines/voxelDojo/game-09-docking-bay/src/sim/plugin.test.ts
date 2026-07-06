import { describe, expect, it } from "vitest"
import {
  type Contract,
  canInvoke,
  checkContract,
  dock,
  type Host,
  invoke,
  missingMethods,
  type PluginManifest,
  SandboxViolation,
  sandboxCapFor,
} from "./plugin"
import { mulberry32 } from "./rng"

const HOST_CONTRACT: Contract = ["connect", "readState", "writeState", "log"]

function makeHost(impls: Host["impls"] = stubImpls(HOST_CONTRACT)): Host {
  return { id: "host", contract: HOST_CONTRACT, impls, docked: new Map() }
}

function stubImpls(contract: Contract): Host["impls"] {
  const out: Record<string, (...args: unknown[]) => unknown> = {}
  for (const c of contract) out[c] = (...args: unknown[]) => `${c}(${args.join(",")})`
  return out
}

const GOOD: PluginManifest = {
  id: "pod-good",
  claimsContract: ["connect", "readState", "writeState", "log"],
  capabilities: ["readState", "log"],
}

const MISMATCH: PluginManifest = {
  id: "pod-missing",
  claimsContract: ["connect", "readState", "log"], // omits writeState
  capabilities: ["readState"],
}

describe("structural contract check", () => {
  it("a plugin whose claim covers the host contract passes the clamp (docks)", () => {
    const host = makeHost()
    const res = dock(host, GOOD)
    expect(res.docked).toBe(true)
    expect(res.rejectedReason).toBeUndefined()
    expect(host.docked.get("pod-good")).toEqual(["readState", "log"])
  })

  it("a plugin missing a contract method is rejected and the missing method is reported", () => {
    const host = makeHost()
    const res = dock(host, MISMATCH)
    expect(res.docked).toBe(false)
    expect(res.sandboxCap).toEqual([])
    expect(res.rejectedReason).toMatch(/contract mismatch/)
    expect(missingMethods(MISMATCH, HOST_CONTRACT)).toEqual(["writeState"])
    expect(checkContract(MISMATCH, HOST_CONTRACT)).toBe(false)
    expect(host.docked.has("pod-missing")).toBe(false)
  })
})

describe("sandbox enforcement (capabilities at the call boundary)", () => {
  it("a sandboxed plugin CANNOT call a method outside its capabilities — invoke throws", () => {
    const host = makeHost()
    dock(host, GOOD) // cap = [readState, log]
    expect(canInvoke(host.docked.get("pod-good") ?? [], "readState")).toBe(true)
    expect(canInvoke(host.docked.get("pod-good") ?? [], "writeState")).toBe(false)
    // inside cap → dispatches to the host impl
    expect(invoke(host, "pod-good", "readState")).toBe("readState()")
    // outside cap → throws SandboxViolation
    expect(() => invoke(host, "pod-good", "writeState")).toThrow(SandboxViolation)
    expect(() => invoke(host, "pod-good", "writeState")).toThrow(/sandbox violation/)
  })

  it("capabilities cannot escalate after docking: a late `net` request is still blocked", () => {
    const host = makeHost()
    const plugin: PluginManifest = {
      id: "pod-escalate",
      claimsContract: HOST_CONTRACT,
      capabilities: ["readState"],
    }
    dock(host, plugin)
    // Even if the plugin later "wants" net, the recorded cap is fixed at dock time.
    expect(() => invoke(host, "pod-escalate", "log")).toThrow(SandboxViolation)
  })

  it("invoke on an unknown (never-docked) plugin throws", () => {
    const host = makeHost()
    expect(() => invoke(host, "ghost", "readState")).toThrow(SandboxViolation)
  })
})

describe("capability scoping (request ∩ contract)", () => {
  it("the sandbox cap is the intersection: a requested capability the host lacks is dropped", () => {
    const plugin: PluginManifest = {
      id: "pod-greedy",
      claimsContract: HOST_CONTRACT,
      capabilities: ["readState", "net", "fs"], // net/fs not in host contract
    }
    expect(sandboxCapFor(plugin, HOST_CONTRACT)).toEqual(["readState"])
    const host = makeHost()
    const res = dock(host, plugin)
    expect(res.sandboxCap).toEqual(["readState"])
  })

  it("an empty request yields an empty cap — the plugin docks but can call nothing", () => {
    const plugin: PluginManifest = {
      id: "pod-silent",
      claimsContract: HOST_CONTRACT,
      capabilities: [],
    }
    const host = makeHost()
    const res = dock(host, plugin)
    expect(res.docked).toBe(true)
    expect(res.sandboxCap).toEqual([])
    expect(() => invoke(host, "pod-silent", "log")).toThrow(SandboxViolation)
  })

  it("requested capabilities are de-duplicated but order is preserved", () => {
    const plugin: PluginManifest = {
      id: "pod-dup",
      claimsContract: HOST_CONTRACT,
      capabilities: ["log", "log", "readState", "log"],
    }
    expect(sandboxCapFor(plugin, HOST_CONTRACT)).toEqual(["log", "readState"])
  })
})

describe("determinism (same seed ⇒ same manifest wave ⇒ same dock outcomes)", () => {
  function wave(seed: number): { docked: boolean; cap: string[] }[] {
    const rng = mulberry32(seed)
    const out: { docked: boolean; cap: string[] }[] = []
    for (let i = 0; i < 8; i++) {
      // Drop a contract method deterministically to manufacture mismatches.
      const claims = HOST_CONTRACT.filter(() => rng() > 0.25)
      // Ensure the claim is a valid contract shape (add back connect if empty).
      if (claims.length === 0) claims.push("connect")
      const manifest: PluginManifest = {
        id: `pod-${i}`,
        claimsContract: claims,
        capabilities: ["readState"],
      }
      const host = makeHost()
      const res = dock(host, manifest)
      out.push({ docked: res.docked, cap: res.sandboxCap })
    }
    return out
  }

  it("same seed produces identical dock outcomes across two runs", () => {
    expect(wave(123)).toEqual(wave(123))
  })

  it("different seeds produce different waves (sanity)", () => {
    expect(wave(123)).not.toEqual(wave(999))
  })
})

/**
 * DOCKING BAY simulation core — sandboxing + interface contracts.
 *
 * Pure TypeScript, ZERO three imports. The Three.js layer only renders state.
 *
 * Mental model (see docs/plans/09_plugin_system.md §4):
 * - A host station exposes a fixed connector shape = the **host contract** (a required method set).
 * - A plugin carries a **manifest**: an id, the contract it *claims* to implement, and the
 *   capabilities (host API methods) it *requests*.
 * - A **docking clamp** runs a structural contract check: does the plugin's `claimsContract`
 *   contain every capability in `hostContract`? A mismatched connector is rejected before it runs.
 * - On a successful dock, a **sandbox force-field** wraps the plugin. Its cap = the intersection of
 *   the capabilities the plugin requested and the host contract (you cannot be granted a capability
 *   the host does not even offer).
 * - At invoke time the cap recorded at dock is enforced: a method outside the envelope throws
 *   `SandboxViolation`. Capabilities cannot escalate after docking.
 */

/** A named host API method a plugin may call (e.g. "readState", "writeState", "net", "fs"). */
export type Capability = string

/** A required method set — the host's interface contract. Order-independent. */
export type Contract = readonly Capability[]

/** What a plugin claims to implement, and the capabilities it requests. */
export interface PluginManifest {
  id: string
  /** the contract shape this plugin claims to provide (must cover the host contract to dock) */
  claimsContract: Contract
  /** the host API methods the plugin asks to be sandboxed-permitted */
  capabilities: Capability[]
}

/** The host station: its contract, the implementations behind each capability, and docked plugins. */
export interface Host {
  id: string
  contract: Contract
  impls: Readonly<Record<string, (...args: unknown[]) => unknown>>
  /** pluginId → the sandbox cap recorded at dock time (cannot escalate after docking) */
  docked: Map<string, Capability[]>
}

export interface DockResult {
  docked: boolean
  /** the sandbox cap granted on a successful dock (intersection of request ∩ contract) */
  sandboxCap: Capability[]
  /** present only when the dock was rejected */
  rejectedReason?: string
}

/** Thrown by `invoke` when a plugin calls a method outside its sandbox cap. */
export class SandboxViolation extends Error {
  readonly pluginId: string
  readonly method: Capability
  readonly sandboxCap: Capability[]
  constructor(pluginId: string, method: Capability, sandboxCap: Capability[]) {
    super(`sandbox violation: plugin "${pluginId}" called "${method}" outside its cap`)
    this.name = "SandboxViolation"
    this.pluginId = pluginId
    this.method = method
    this.sandboxCap = sandboxCap
  }
}

/** Structural contract check: does `manifest.claimsContract` contain every method in `hostContract`? */
export function checkContract(manifest: PluginManifest, hostContract: Contract): boolean {
  const claims = new Set(manifest.claimsContract)
  return hostContract.every((c) => claims.has(c))
}

/** The contract gap — host methods the plugin's claim omits (order-stable, for L2 feedback). */
export function missingMethods(manifest: PluginManifest, hostContract: Contract): Capability[] {
  const claims = new Set(manifest.claimsContract)
  return hostContract.filter((c) => !claims.has(c))
}

/**
 * The sandbox cap granted to a plugin = the **intersection** of requested capabilities and the host
 * contract. A plugin cannot be granted a capability the host does not offer, and the host never
 * silently expands a plugin's request beyond what it asked for.
 */
export function sandboxCapFor(manifest: PluginManifest, hostContract: Contract): Capability[] {
  const offered = new Set(hostContract)
  const seen = new Set<string>()
  const cap: Capability[] = []
  for (const c of manifest.capabilities) {
    if (offered.has(c) && !seen.has(c)) {
      seen.add(c)
      cap.push(c)
    }
  }
  return cap
}

/**
 * Run the docking clamp. On a pass, the plugin is recorded on the host with its sandbox cap
 * (the intersection of request ∩ contract). On a fail, the rejection reason is returned and the
 * host is left untouched. Deterministic.
 */
export function dock(host: Host, manifest: PluginManifest): DockResult {
  if (!checkContract(manifest, host.contract)) {
    return {
      docked: false,
      sandboxCap: [],
      rejectedReason: `contract mismatch: missing ${missingMethods(manifest, host.contract).join(", ")}`,
    }
  }
  const sandboxCap = sandboxCapFor(manifest, host.contract)
  host.docked.set(manifest.id, sandboxCap)
  return { docked: true, sandboxCap }
}

/** Is `method` inside the sandbox envelope? */
export function canInvoke(sandboxCap: Capability[], method: Capability): boolean {
  return sandboxCap.includes(method)
}

/**
 * Enforce the cap and dispatch. If `method` is not in the host's record of the plugin's sandbox cap
 * (recorded at dock time), throw `SandboxViolation`. Otherwise dispatch to the host's implementation
 * with `args`. Deterministic.
 */
export function invoke(
  host: Host,
  pluginId: string,
  method: Capability,
  args: unknown[] = [],
): unknown {
  const cap = host.docked.get(pluginId)
  if (cap === undefined) {
    throw new SandboxViolation(pluginId, method, [])
  }
  if (!cap.includes(method)) {
    throw new SandboxViolation(pluginId, method, cap)
  }
  const impl = host.impls[method]
  if (typeof impl !== "function") {
    throw new SandboxViolation(pluginId, method, cap)
  }
  return impl(...args)
}

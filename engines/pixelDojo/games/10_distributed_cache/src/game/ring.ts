// Pure consistent-hash ring logic. This is the concept the game teaches — every
// visual in the 3D scene is a projection of this object's state. Logic lives
// here so it can be unit-tested without a DOM/three.js.
//
// Invariants encoded (mirrors curriculum/10_distributed_cache/docs/spec.md):
//   RF-RING  A key's owner under RING is the next vnode clockwise from
//            hashToRing(key), wrapping around the ring.
//   RF-MODN  A key's owner under MOD-N is sorted_nodes[hashToRing(key) % N]
//            — the trap strategy that scrambles on every add/remove.
//   RF-PLACE Nodes are placed at their vnode positions; vnodes scatter so arcs
//            are unequal (a real consistent-hash ring, not round-robin).
//   RF-CHURN On add/remove, only the keys whose next-clockwise vnode changed
//            re-home — minimal remap under RING; ~everything under MOD-N.

export const RING_SIZE = 64

export type Strategy = "ring" | "modn"
export type NodeId = string

export type Vnode = { readonly nodeId: NodeId; readonly pos: number }

export type RingNode = {
  readonly id: NodeId
  readonly vnodes: readonly number[]
}

// Deterministic, player-legible string hash → 0..RING_SIZE-1. Uses a small
// polynomial rolling hash so different keys scatter across the ring; the
// player doesn't need to predict the position (the HUD shows it on each orb).
export function hashToRing(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0
  }
  return h % RING_SIZE
}

export class HashRing {
  private readonly nodes = new Map<NodeId, RingNode>()

  size(): number {
    return this.nodes.size
  }

  has(id: NodeId): boolean {
    return this.nodes.has(id)
  }

  add(id: NodeId, vnodes: readonly number[]): void {
    if (vnodes.length === 0) {
      throw new Error(`node ${id} needs at least one vnode`)
    }
    for (const v of vnodes) {
      if (!Number.isInteger(v) || v < 0 || v >= RING_SIZE) {
        throw new Error(`vnode ${v} out of range [0, ${RING_SIZE})`)
      }
    }
    this.nodes.set(id, { id, vnodes })
  }

  remove(id: NodeId): boolean {
    return this.nodes.delete(id)
  }

  list(): readonly RingNode[] {
    return [...this.nodes.values()]
  }

  // Sorted vnode list (clockwise around the ring from position 0).
  vnodesSorted(): readonly Vnode[] {
    const out: Vnode[] = []
    for (const node of this.nodes.values()) {
      for (const pos of node.vnodes) {
        out.push({ nodeId: node.id, pos })
      }
    }
    return out.sort((a, b) => a.pos - b.pos)
  }

  // Owner under RING strategy: next vnode clockwise from hashPos (wraps).
  ownerRing(hashPos: number): NodeId | null {
    if (this.nodes.size === 0) return null
    const vnodes = this.vnodesSorted()
    for (const v of vnodes) {
      if (v.pos >= hashPos) return v.nodeId
    }
    const first = vnodes[0]
    return first === undefined ? null : first.nodeId
  }

  // Owner under MOD-N: hashPos % nodeCount indexes into sorted node IDs.
  // This is the trap — on add/remove, almost every key's index changes.
  ownerModN(hashPos: number): NodeId | null {
    if (this.nodes.size === 0) return null
    const ids = [...this.nodes.keys()].sort()
    const pick = ids[hashPos % ids.length]
    return pick === undefined ? null : pick
  }

  owner(hashPos: number, strategy: Strategy): NodeId | null {
    return strategy === "ring" ? this.ownerRing(hashPos) : this.ownerModN(hashPos)
  }

  ownerOfKey(key: string, strategy: Strategy): NodeId | null {
    return this.owner(hashToRing(key), strategy)
  }
}

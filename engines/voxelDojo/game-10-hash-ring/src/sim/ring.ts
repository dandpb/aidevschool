import { ringHash } from "./hash"

/** A cache station placed on the ring. `vnodes` ≥ 1 (virtual nodes / ghost anchors). */
export interface Station {
  id: string
  vnodes: number
}

/** One anchor point on the ring (a station's primary or virtual position). */
export interface Anchor {
  hash: number
  stationId: string
}

/** key → owning stationId */
export type Assignment = ReadonlyMap<string, string>

/** All anchors for the given stations, sorted clockwise by hash. */
export function anchorsOf(stations: readonly Station[]): Anchor[] {
  const anchors: Anchor[] = []
  for (const s of stations) {
    for (let v = 0; v < Math.max(1, s.vnodes); v++) {
      anchors.push({ hash: ringHash(`${s.id}#${v}`), stationId: s.id })
    }
  }
  anchors.sort((a, b) => a.hash - b.hash)
  return anchors
}

/** Consistent-hashing ownership: first anchor clockwise from the key's hash (wrapping to the first). */
export function ownerOf(keyHash: number, anchors: readonly Anchor[]): string {
  if (anchors.length === 0) throw new Error("empty ring")
  let lo = 0
  let hi = anchors.length - 1
  if (keyHash > (anchors[hi] as Anchor).hash) return (anchors[0] as Anchor).stationId
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if ((anchors[mid] as Anchor).hash >= keyHash) hi = mid
    else lo = mid + 1
  }
  return (anchors[lo] as Anchor).stationId
}

/** Assign every key to its consistent-hashing owner. */
export function assign(keys: readonly string[], stations: readonly Station[]): Assignment {
  const anchors = anchorsOf(stations)
  const out = new Map<string, string>()
  for (const k of keys) out.set(k, ownerOf(ringHash(k), anchors))
  return out
}

/** Naive contrast model: owner = sortedStations[hash % N]. Any topology change reshuffles ~everything. */
export function moduloAssign(keys: readonly string[], stations: readonly Station[]): Assignment {
  const ids = stations.map((s) => s.id).sort()
  if (ids.length === 0) throw new Error("empty ring")
  const out = new Map<string, string>()
  for (const k of keys) out.set(k, ids[ringHash(k) % ids.length] as string)
  return out
}

/** Keys whose owner differs between two assignments. */
export function movedKeys(before: Assignment, after: Assignment): string[] {
  const moved: string[] = []
  for (const [k, owner] of before) {
    if (after.get(k) !== owner) moved.push(k)
  }
  return moved
}

/** Per-station key counts. Stations with zero keys are included. */
export function loadOf(assignment: Assignment, stations: readonly Station[]): Map<string, number> {
  const load = new Map<string, number>(stations.map((s) => [s.id, 0]))
  for (const owner of assignment.values()) load.set(owner, (load.get(owner) ?? 0) + 1)
  return load
}

/** Load skew = max station load / mean station load. 1.0 is perfect balance. */
export function loadSkew(assignment: Assignment, stations: readonly Station[]): number {
  if (stations.length === 0) throw new Error("empty ring")
  const load = loadOf(assignment, stations)
  const counts = [...load.values()]
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length
  if (mean === 0) return 1
  return Math.max(...counts) / mean
}

/** Theoretical moved fraction when going from N to M stations under consistent hashing. */
export function theoreticalMovedFraction(nBefore: number, nAfter: number): number {
  if (nAfter > nBefore) return (nAfter - nBefore) / nAfter // joins: keys the new nodes take
  return (nBefore - nAfter) / nBefore // leaves: keys the departed nodes held
}

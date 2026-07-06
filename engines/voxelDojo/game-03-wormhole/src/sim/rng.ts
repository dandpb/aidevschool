export type Rng = () => number

/** Mulberry32 — small deterministic PRNG. Same seed ⇒ same URL stream ⇒ replayable attempts. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

/** Deterministic stream of fake long URLs. Same seed ⇒ same URLs ⇒ replayable waves. */
export function urlStream(rng: Rng, count: number): string[] {
  const urls: string[] = []
  for (let i = 0; i < count; i++) {
    const host = HOSTS[Math.floor(rng() * HOSTS.length) % HOSTS.length]
    const path = Math.floor(rng() * 1e9).toString(36)
    urls.push(`https://${host}/${path}-${i}`)
  }
  return urls
}

const HOSTS = ["ada.io", "bytes.dev", "cache.net", "delta.app", "edge.run", "flux.sys"] as const

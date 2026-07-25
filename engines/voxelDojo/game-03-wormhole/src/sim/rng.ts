export { mulberry32, type Rng } from "../../../shared/rng"

import type { Rng } from "../../../shared/rng"

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

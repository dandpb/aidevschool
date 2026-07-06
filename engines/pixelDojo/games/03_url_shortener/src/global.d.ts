import type { SlugLauncherEvidenceRecord } from "./game/evidence/types"

declare global {
  interface Window {
    // In-page evidence channel. The Playwright smoke run reads this to
    // persist NDJSON. Set once per cleared wave (latest record wins).
    __gameEvidence?: SlugLauncherEvidenceRecord
    // Debug hook used by the smoke test to drive the wave without timing
    // races: `forceFire()` / `forceRetry()` run the same code paths as the
    // keyboard handler, but synchronously.
    __slugLauncherDebug?: {
      forceFire: () => void
      forceRetry: () => void
      setStrategy: (s: "auto" | "hash" | "snowflake") => void
      getStatus: () => string
    }
  }
}

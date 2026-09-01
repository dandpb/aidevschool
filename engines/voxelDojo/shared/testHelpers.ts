/** Shared Playwright test helpers for voxelDojo evidence smoke specs. */

export interface EvidenceRecord {
  source: string
  unit_id: string
  project: string
  scenario_id: string
  game?: string
  pass: boolean
  metrics: Record<string, number | boolean | string>
  observations: {
    kind: string
    predictions?: ReadonlyArray<{ key: string; shelf: number }>
    probes?: ReadonlyArray<{ key: string; predictedAlive: boolean }>
    predictedSwept?: number
    hashStrength?: number | "full"
    [key: string]: unknown
  }
}

export function collectEvidence(lines: string[]): EvidenceRecord[] {
  return lines
    .filter((l) => l.startsWith("EVIDENCE "))
    .map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
}

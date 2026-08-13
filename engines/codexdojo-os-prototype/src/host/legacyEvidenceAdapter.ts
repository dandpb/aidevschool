const TEACHING_EVIDENCE_MESSAGE = 'aidevschool:teaching-evidence'
const MAX_MESSAGE_SIZE = 16_384

type UnknownRecord = Readonly<Record<string, unknown>>

export type EmbeddedEvidenceReceipt = {
  readonly source: 'pixelquest' | 'voxeldojo'
  readonly project: string
  readonly attemptId: string
  readonly game: string
  readonly timestamp: string
  readonly pass: boolean
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(record: UnknownRecord, key: string): string | null {
  const value = record[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function readEmbeddedEvidenceMessage(
  event: MessageEvent<unknown>,
  expectedSource: Window | null,
  frameUrl: string,
  expectedEvidenceSource: EmbeddedEvidenceReceipt['source'] | null,
): EmbeddedEvidenceReceipt | null {
  if (expectedSource === null || expectedEvidenceSource === null || event.source !== expectedSource) {
    return null
  }
  if (event.origin !== new URL(frameUrl, window.location.href).origin) return null
  if (!isRecord(event.data)) return null

  let serialized: string
  try {
    serialized = JSON.stringify(event.data)
  } catch {
    return null
  }
  if (serialized.length > MAX_MESSAGE_SIZE) return null
  if (event.data.type !== TEACHING_EVIDENCE_MESSAGE || event.data.version !== 1) return null
  if (!isRecord(event.data.evidence)) return null

  const evidence = event.data.evidence
  const source = evidence.source
  if (source !== expectedEvidenceSource) return null
  const project = requiredString(evidence, 'project')
  const attemptId = requiredString(evidence, 'scenario_id') ?? requiredString(evidence, 'encounter_id')
  const game = requiredString(evidence, 'game')
  const timestamp = requiredString(evidence, 'ts')
  if (project === null || attemptId === null || game === null || timestamp === null) return null
  if (typeof evidence.pass !== 'boolean') return null
  if (!isRecord(evidence.review_context) || evidence.review_context.verifier_required !== true) return null

  return { source: expectedEvidenceSource, project, attemptId, game, timestamp, pass: evidence.pass }
}

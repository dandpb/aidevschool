import { receiptMatchesRecordIdentity } from '../src/verification/receiptContract'
import type { ActionExecutor, ProcessSpec } from './actions'

const LITERACY_VERIFIER: ProcessSpec = {
  action: 'verify-literacy-evidence',
  executable: 'python3',
  args: ['-m', 'learner.gate.literacy_bridge'],
  cwd: '../..',
  timeoutMs: 10_000,
}
const TEACHING_GAME_VERIFIER: ProcessSpec = {
  action: 'verify-teaching-game-evidence',
  executable: 'python3',
  args: ['-m', 'learner.gate.teaching_game_bridge'],
  cwd: '../..',
  timeoutMs: 10_000,
}

const FIXED_VERIFIERS = new Map<string, ProcessSpec>([
  ['literacy-evidence:1', LITERACY_VERIFIER],
  ['teaching-game-evidence:1', TEACHING_GAME_VERIFIER],
])

export async function executeFixedVerification(input: {
  readonly schemaId: string
  readonly schemaVersion: number
  readonly record: Readonly<Record<string, unknown>>
}, executor: ActionExecutor): Promise<
  | { readonly ok: true; readonly receipt: Readonly<Record<string, unknown>> }
  | { readonly ok: false; readonly code: string }
> {
  const verifier = FIXED_VERIFIERS.get(`${input.schemaId}:${input.schemaVersion}`)
  if (verifier === undefined) return { ok: false, code: 'unsupported-schema' }
  const processReceipt = await executor(verifier, JSON.stringify(input.record))
  if (processReceipt.exitCode !== 0 && processReceipt.exitCode !== 1) {
    return { ok: false, code: 'verifier-failed' }
  }
  let receipt: unknown
  try {
    receipt = JSON.parse(processReceipt.stdout)
  } catch {
    return { ok: false, code: 'verifier-failed' }
  }
  if (!receiptMatchesRecordIdentity(receipt, input.record)) {
    return { ok: false, code: 'invalid-verifier-response' }
  }
  return { ok: true, receipt }
}

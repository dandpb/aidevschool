import { receiptIsBound } from '../src/verification/receiptContract'
import type { ActionExecutor, ProcessSpec } from './actions'

const LITERACY_SCHEMA_ID = 'literacy-evidence'
const LITERACY_SCHEMA_VERSION = 1
const LITERACY_VERIFIER: ProcessSpec = {
  action: 'verify-literacy-evidence',
  executable: 'python3',
  args: ['-m', 'learner.gate.literacy_bridge'],
  cwd: '../..',
  timeoutMs: 10_000,
}

export async function executeFixedVerification(input: {
  readonly schemaId: string
  readonly schemaVersion: number
  readonly record: Readonly<Record<string, unknown>>
}, executor: ActionExecutor): Promise<
  | { readonly ok: true; readonly receipt: Readonly<Record<string, unknown>> }
  | { readonly ok: false; readonly code: string }
> {
  if (
    input.schemaId !== LITERACY_SCHEMA_ID
    || input.schemaVersion !== LITERACY_SCHEMA_VERSION
  ) {
    return { ok: false, code: 'unsupported-schema' }
  }
  const processReceipt = await executor(LITERACY_VERIFIER, JSON.stringify(input.record))
  if (processReceipt.exitCode !== 0 && processReceipt.exitCode !== 1) {
    return { ok: false, code: 'verifier-failed' }
  }
  let receipt: unknown
  try {
    receipt = JSON.parse(processReceipt.stdout)
  } catch {
    return { ok: false, code: 'invalid-verifier-response' }
  }
  if (!receiptIsBound(receipt, input.record)) {
    return { ok: false, code: 'invalid-verifier-response' }
  }
  return { ok: true, receipt }
}

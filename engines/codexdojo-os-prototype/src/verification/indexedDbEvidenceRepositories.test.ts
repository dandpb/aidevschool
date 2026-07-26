import { describe, expect, it } from 'vitest'
import { IndexedDbVerificationStore } from './indexedDbEvidenceRepositories'
import type { RawEvidenceEntry, StoredVerificationReceipt } from './ports'

const raw: RawEvidenceEntry = {
  schemaId: 'literacy-evidence',
  schemaVersion: 1,
  engineId: 'literacyDojo',
  missionRunId: 'run-1',
  subject: { missionId: 'l02', unitId: 'ai-literacy:l02' },
  record: { lessonId: 'l02' },
  storageId: 'run-1',
  missionVersion: 3,
  acceptedAt: '2026-07-25T12:00:00.000Z',
  status: 'verified',
  evidenceDigest: 'a'.repeat(64),
}

const receipt: StoredVerificationReceipt = {
  storageId: 'run-1',
  evidenceDigest: 'a'.repeat(64),
  missionId: 'l02',
  missionVersion: 3,
  storedAt: '2026-07-25T12:01:00.000Z',
  receipt: {
    verdict: 'PASS',
    context_isolated: true,
    source: 'independent-literacy-verifier',
    evidence_digest: 'a'.repeat(64),
    lesson_id: 'l02',
    activity_id: 'l02-a1',
    attempt_id: 'attempt-1',
    activity_type: 'output_comparison',
    score: 1,
    producer_pass_claim: true,
    independent_pass: true,
    mastery_eligible: true,
    errors: [],
    producer_writes_mastered: false,
    max_producer_claim: 'completed',
  },
}

function fakeDatabase(abort: boolean) {
  const values = new Map<string, unknown>()
  const transactions: { names: string[]; mode: IDBTransactionMode }[] = []
  const database = {
    close() {},
    transaction(names: string | string[], mode: IDBTransactionMode = 'readonly') {
      const normalizedNames = typeof names === 'string' ? [names] : names
      transactions.push({ names: normalizedNames, mode })
      const pending: [string, unknown][] = []
      const transaction = {
        error: null,
        oncomplete: null as (() => void) | null,
        onabort: null as (() => void) | null,
        onerror: null as (() => void) | null,
        objectStore(name: string) {
          return {
            put(value: unknown) {
              pending.push([name, value])
              return {} as IDBRequest<IDBValidKey>
            },
          } as IDBObjectStore
        },
      }
      queueMicrotask(() => {
        if (abort) {
          transaction.onabort?.()
          return
        }
        for (const [name, value] of pending) values.set(name, value)
        transaction.oncomplete?.()
      })
      return transaction as unknown as IDBTransaction
    },
  } as unknown as IDBDatabase
  return { database, transactions, values }
}

describe('IndexedDbVerificationStore', () => {
  it('commits verified raw evidence and its receipt in one readwrite transaction', async () => {
    const fake = fakeDatabase(false)
    const store = new IndexedDbVerificationStore(async () => fake.database)

    await store.commitVerified(raw, receipt)

    expect(fake.transactions).toEqual([{
      names: ['raw-evidence-v2', 'verification-receipts'],
      mode: 'readwrite',
    }])
    expect(fake.values.get('raw-evidence-v2')).toEqual(raw)
    expect(fake.values.get('verification-receipts')).toEqual(receipt)
  })

  it('leaves neither side visible when the transaction aborts', async () => {
    const fake = fakeDatabase(true)
    const store = new IndexedDbVerificationStore(async () => fake.database)

    await expect(store.commitVerified(raw, receipt)).rejects.toThrow('transaction aborted')

    expect(fake.values.size).toBe(0)
  })
})

import type {
  RawEvidenceEntry,
  StoredVerificationReceipt,
  VerificationStore,
} from './ports'

const DB_NAME = 'codexdojo-os-verification'
const DB_VERSION = 2
const RAW_STORE = 'raw-evidence-v2'
const RECEIPT_STORE = 'verification-receipts'

type DatabaseOpener = () => Promise<IDBDatabase>

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(RAW_STORE)) {
        database.createObjectStore(RAW_STORE, { keyPath: 'storageId' })
      }
      if (!database.objectStoreNames.contains(RECEIPT_STORE)) {
        database.createObjectStore(RECEIPT_STORE, { keyPath: 'evidenceDigest' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open verification storage'))
  })
}

export class IndexedDbVerificationStore implements VerificationStore {
  private connection: Promise<IDBDatabase> | null = null

  constructor(private readonly opener: DatabaseOpener = openDatabase) {}

  async getRaw(storageId: string): Promise<RawEvidenceEntry | undefined> {
    return this.read<RawEvidenceEntry>(RAW_STORE, storageId)
  }

  async getReceipt(evidenceDigest: string): Promise<StoredVerificationReceipt | undefined> {
    return this.read<StoredVerificationReceipt>(RECEIPT_STORE, evidenceDigest)
  }

  async putRaw(entry: RawEvidenceEntry): Promise<void> {
    const database = await this.open()
    const transaction = database.transaction(RAW_STORE, 'readwrite')
    transaction.objectStore(RAW_STORE).put(entry)
    await transactionDone(transaction)
  }

  async latestForMission(missionId: string): Promise<RawEvidenceEntry | undefined> {
    const database = await this.open()
    const entries = await requestResult(
      database.transaction(RAW_STORE).objectStore(RAW_STORE).getAll(),
    ) as RawEvidenceEntry[]
    return entries
      .filter((entry) => entry.subject.missionId === missionId)
      .sort((left, right) => (
        right.acceptedAt.localeCompare(left.acceptedAt)
        || right.storageId.localeCompare(left.storageId)
      ))[0]
  }

  async commitVerified(
    raw: RawEvidenceEntry,
    receipt: StoredVerificationReceipt,
  ): Promise<void> {
    const database = await this.open()
    const transaction = database.transaction([RAW_STORE, RECEIPT_STORE], 'readwrite')
    transaction.objectStore(RAW_STORE).put(raw)
    transaction.objectStore(RECEIPT_STORE).put(receipt)
    await transactionDone(transaction)
  }

  /** One connection per store instance: a single submission runs 4+ operations. */
  private open(): Promise<IDBDatabase> {
    this.connection ??= this.opener().catch((error: unknown) => {
      this.connection = null
      throw error
    })
    return this.connection
  }

  private async read<T>(storeName: string, key: string): Promise<T | undefined> {
    const database = await this.open()
    return await requestResult(database.transaction(storeName).objectStore(storeName).get(key)) as
      | T
      | undefined
  }
}

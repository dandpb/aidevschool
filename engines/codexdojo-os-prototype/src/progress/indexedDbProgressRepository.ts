import type { OsProgress, OsProgressRepository } from './domain'

const DATABASE_NAME = 'codexdojo-os'
const DATABASE_VERSION = 1
const STORE_NAME = 'progress'
const PROGRESS_KEY = 'os-progress'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open OS progress database'))
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('OS progress transaction failed'))
  })
}

export class IndexedDbProgressRepository implements OsProgressRepository {
  async load(): Promise<unknown | null> {
    const database = await openDatabase()
    try {
      const value = await requestResult(
        database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(PROGRESS_KEY),
      )
      return value ?? null
    } finally {
      database.close()
    }
  }

  async save(progress: OsProgress): Promise<void> {
    const database = await openDatabase()
    try {
      await requestResult(
        database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(progress, PROGRESS_KEY),
      )
    } finally {
      database.close()
    }
  }

  async reset(): Promise<void> {
    const database = await openDatabase()
    try {
      await requestResult(
        database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(PROGRESS_KEY),
      )
    } finally {
      database.close()
    }
  }
}

import { expect, test, type Page } from '@playwright/test'
import { missionCatalog } from '../src/data/missions'
import {
  completeOnboarding,
  createInitialOsProgress,
  recordMissionCompletion,
} from '../src/progress/domain'

async function seedProgress(page: Page, progress: unknown) {
  await page.evaluate((value) => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('codexdojo-os', 1)
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains('progress')) open.result.createObjectStore('progress')
    }
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const database = open.result
      const transaction = database.transaction('progress', 'readwrite')
      transaction.objectStore('progress').put(value, 'os-progress')
      transaction.oncomplete = () => { database.close(); resolve() }
      transaction.onerror = () => reject(transaction.error)
    }
  }), progress)
}

async function readProgress(page: Page): Promise<Record<string, unknown> | undefined> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('codexdojo-os', 1)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const database = open.result
      const request = database.transaction('progress').objectStore('progress').get('os-progress')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => { database.close(); resolve(request.result) }
    }
  }))
}

async function seedRejectedVerification(page: Page, mission: {
  readonly id: string
  readonly unitId: string
  readonly version: number
}) {
  await page.evaluate((missionIdentity) => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('codexdojo-os-verification', 2)
    open.onupgradeneeded = () => {
      const database = open.result
      if (!database.objectStoreNames.contains('raw-evidence-v2')) {
        database.createObjectStore('raw-evidence-v2', { keyPath: 'storageId' })
      }
      if (!database.objectStoreNames.contains('verification-receipts')) {
        database.createObjectStore('verification-receipts', { keyPath: 'evidenceDigest' })
      }
    }
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const database = open.result
      const transaction = database.transaction('raw-evidence-v2', 'readwrite')
      transaction.objectStore('raw-evidence-v2').put({
        storageId: `rejected-${missionIdentity.id}-run`,
        schemaId: 'teaching-game-evidence',
        schemaVersion: 1,
        engineId: 'voxelDojo',
        missionRunId: `rejected-${missionIdentity.id}-run`,
        subject: { missionId: missionIdentity.id, unitId: missionIdentity.unitId },
        record: {},
        missionVersion: missionIdentity.version,
        acceptedAt: '2026-07-25T10:00:00.000Z',
        status: 'rejected',
        rejectionCode: 'deterministic-check-failed',
      })
      transaction.oncomplete = () => { database.close(); resolve() }
      transaction.onerror = () => reject(transaction.error)
    }
  }), mission)
}

test('prioritizes a due canonical review without copying mastery into local progress', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('track-option-dev').click()
  await page.getByRole('button', { name: 'Entrar na escola' }).click()

  await expect(page.getByRole('heading', { name: 'WAREHOUSE: Key-Value Store (in-memory)' })).toBeVisible()
  await expect(page.getByText(/Revisão (do dia|atrasada)/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Revisar agora' })).toBeVisible()
  await expect(page.getByText('XP local').locator('..')).toContainText('0')
})

test('recovers from failed verification and preserves rewards across reloads without punishment', async ({ page }) => {
  const warehouse = missionCatalog.missions.find((mission) => mission.id === 'game-02-warehouse')
  const wormhole = missionCatalog.missions.find((mission) => mission.id === 'game-03-wormhole')
  if (warehouse === undefined || wormhole === undefined) throw new Error('Expected Dev missions')
  let progress = completeOnboarding(createInitialOsProgress(missionCatalog), {
    goal: 'build-systems',
    context: 'personal-project',
    confidence: 'high',
    selectedTrackId: 'dev',
  })
  progress = recordMissionCompletion(progress, warehouse, missionCatalog, undefined, {
    now: new Date('2026-07-20T10:00:00-03:00'),
    canonicalReviewKey: `${warehouse.unitId}:overdue:overdue 4d`,
  })
  progress = recordMissionCompletion(progress, wormhole, missionCatalog, undefined, {
    now: new Date('2026-07-20T11:00:00-03:00'),
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'O que você quer conseguir fazer com IA?' })).toBeVisible()
  await seedProgress(page, progress)
  await expect.poll(() => readProgress(page)).toMatchObject({ schemaVersion: 3, onboarding: { completed: true } })
  await seedRejectedVerification(page, wormhole)
  await page.goto('/')

  await expect.poll(() => readProgress(page)).toMatchObject({ schemaVersion: 3, onboarding: { completed: true } })

  await expect(page.getByText('Recuperação guiada', { exact: false })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'WORMHOLE: URL Shortener' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  await expect(page.getByText(/Uma pausa não remove XP/)).toBeVisible()
  await expect(page.getByText('XP local').locator('..')).toContainText('50')
  await expect(page.getByText(/\bvidas?\b|\benergia\b/i)).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  await expect(page.getByText('XP local').locator('..')).toContainText('50')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

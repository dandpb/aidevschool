import { expect, test, type Page } from '@playwright/test'
import { missionCatalog } from '../src/data/missions'
import { completeOnboarding, createInitialOsProgress } from '../src/progress/domain'

/**
 * AID-5190/W7 — contrato de componentes HUD (design-foundations §7.2/§7.3)
 * no codexdojo-os-prototype: anatomia canônica dos 4 papéis com testids
 * `hud-*`, medidores com `role="progressbar"` + `aria-valuetext` (B9c —
 * meta 1/3 → 3/3 engines, INCLUINDO os medidores dos grids do OS),
 * MasteryBadge cor+texto+glifo (B3) nos nós verified/canonical-mastery do
 * mapa, ReviewDue reason+dueIn pt-BR (coberto em src/journey/Hub.test.tsx
 * com a projeção canônica real — o hub público é anônimo por design,
 * ec534f7), live region de ritmo local e responsividade 375/768/1280 com
 * alvos ≥44px (B6).
 *
 * Especificação compartilhada entre engines (mesma forma de asserts em
 * dojoToday e literacyDojo — métrica HUD §6 do contrato).
 *
 * Mutation-guard: remover o valuetext de qualquer medidor, o role do
 * medidor do grid (app Trilhas Dojo), os badges do mapa ou a live region
 * falha este spec.
 */

/** Onboarding concluído (dev) no IndexedDB — suficiente para o hub rotear. */
async function seedOnboarded(page: Page) {
  const progress = completeOnboarding(createInitialOsProgress(missionCatalog), {
    goal: 'build-systems',
    context: 'personal-project',
    confidence: 'high',
    selectedTrackId: 'dev',
  })
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('codexdojo-os', 1)
        open.onupgradeneeded = () => {
          if (!open.result.objectStoreNames.contains('progress'))
            open.result.createObjectStore('progress')
        }
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const database = open.result
          const transaction = database.transaction('progress', 'readwrite')
          transaction.objectStore('progress').put(value, 'os-progress')
          transaction.oncomplete = () => {
            database.close()
            resolve()
          }
          transaction.onerror = () => reject(transaction.error)
        }
      }),
    progress,
  )
}

/**
 * Recibo de verificação independente PASS para game-02-warehouse no
 * IndexedDB do verificador (mesma porta de entrada do progression.smoke
 * "recovers from failed verification") — leva o nó do mapa ao overlay
 * `verified`, que carrega o MasteryBadge do contrato §7.2.
 */
async function seedVerifiedReceipt(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
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
          const transaction = database.transaction(['raw-evidence-v2', 'verification-receipts'], 'readwrite')
          transaction.objectStore('raw-evidence-v2').put({
            storageId: 'verified-game-02-warehouse-run',
            schemaId: 'teaching-game-evidence',
            schemaVersion: 1,
            engineId: 'voxelDojo',
            missionRunId: 'verified-game-02-warehouse-run',
            subject: { missionId: 'game-02-warehouse', unitId: 'U2-key-value-store' },
            record: {},
            missionVersion: 1,
            acceptedAt: '2026-10-01T10:00:00.000Z',
            status: 'verified',
            evidenceDigest: 'a'.repeat(64),
          })
          transaction.objectStore('verification-receipts').put({
            storageId: 'verified-game-02-warehouse-run',
            evidenceDigest: 'a'.repeat(64),
            missionId: 'game-02-warehouse',
            missionVersion: 1,
            storedAt: '2026-10-01T10:01:00.000Z',
            receipt: {
              schema_version: 1,
              verdict: 'PASS',
              context_isolated: true,
              source: 'independent-teaching-game-verifier',
              evidence_digest: 'a'.repeat(64),
              unit_id: 'U2-key-value-store',
              project: '02_key_value_store',
              scenario_id: 'verified-hud-w7',
              game: 'KV WAREHOUSE',
              producer_pass_claim: null,
              independent_pass: true,
              errors: [],
              producer_writes_mastered: false,
              max_producer_claim: 'completed',
              canonical_gate_status: 'not-submitted',
              canonical_gate_reason: 'learner-attempt-and-gate-eligibility-required',
            },
          })
          transaction.oncomplete = () => {
            database.close()
            resolve()
          }
          transaction.onerror = () => reject(transaction.error)
        }
      }),
  )
}

test('w7-1: anatomia do Hub — medidor com valuetext, streak, live region — AID-5190/W7', async ({
    page,
  }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1280')
  await page.goto('/')
  await seedOnboarded(page)
  await page.goto('/', { waitUntil: 'networkidle' })

  // ProgressMeter (Hub): role=progressbar + valuetext "N% concluído" +
  // leitura textual "X/Y missões" adjacente (nunca só barra).
  const meter = page.getByTestId('hud-progress').first()
  await expect(meter).toHaveAttribute('role', 'progressbar')
  await expect(meter).toHaveAttribute('aria-valuetext', /% concluído$/)
  await expect(meter).toHaveAttribute('aria-valuenow', /^\d+$/)
  await expect(meter).toHaveAttribute('aria-valuemin', '0')
  await expect(meter).toHaveAttribute('aria-valuemax', /^\d+$/)
  await expect(page.locator('.hub-meter-read')).toContainText(/\/\d+ missões concluídas/)

  // StreakChip: texto de ritmo/sequência local + glifo aria-hidden.
  const streak = page.getByTestId('hud-streak')
  await expect(streak).toContainText(/Sequência local|ritmo/i)
  expect(await streak.locator("[aria-hidden='true']").count()).toBeGreaterThanOrEqual(1)

  // ReviewDue: NÃO renderiza no hub público — anônimo por design (ec534f7,
  // progression.smoke.spec.ts); a superfície canônica com reason+dueIn pt-BR
  // é coberta deterministicamente em src/journey/Hub.test.tsx (learner real)
  // + src/missions/reviewMapping.test.ts. FSRS segue fora do escopo do OS
  // (§7.4 do contrato).
  await expect(page.getByTestId('hud-review-due')).toHaveCount(0)

  // Live region: role=status + anúncio do ritmo local após o render.
  const live = page.getByTestId('hud-live-region')
  await expect(live).toHaveAttribute('role', 'status')
  await expect(live).toHaveAttribute('aria-live', 'polite')
  await expect
    .poll(async () => (await live.textContent()) ?? '', { timeout: 5_000 })
    .toContain('Meta de hoje')

  // B9c no documento inteiro: todo medidor com role tem valuetext.
  const meters = await page.locator("[role='progressbar']").all()
  expect(meters.length).toBeGreaterThanOrEqual(1)
  for (const m of meters) {
    await expect(m).toHaveAttribute('aria-valuetext', /% concluído$/)
  }
})

test('w7-2: MasteryBadge cor+texto+glifo nos grids do mapa (verified/canonical-mastery) — AID-5190/W7', async ({
    page,
  }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1280')
  await page.goto('/')
  await seedOnboarded(page)
  await seedVerifiedReceipt(page)
  await page.goto('/map')
  await expect(page.locator('.mission-map-node').first()).toBeVisible()

  const badges = page.getByTestId('hud-mastery-badge')
  expect(await badges.count()).toBeGreaterThanOrEqual(1)
  for (const badge of await badges.all()) {
    await expect(badge).toContainText(/Dominada|Verificada/)
    expect(await badge.locator("[aria-hidden='true']").count()).toBeGreaterThanOrEqual(1)
  }
  // Vocabulário canônico: o badge de mastery nunca lê "Concluída".
  await expect(badges.filter({ hasText: 'Concluída' })).toHaveCount(0)
})

test('w7-3: medidor do grid (app Trilhas Dojo) com role=progressbar + valuetext — AID-5190/W7', async ({
    page,
  }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1280')
  await page.goto('/desktop?operator=1')
  await page.getByRole('button', { name: 'Atividades' }).click()
  const launcher = page.getByRole('dialog', { name: 'Lançador de aplicativos' })
  await launcher.getByRole('textbox', { name: 'Buscar aplicativos ou fundamentos' }).fill('Trilhas Dojo')
  await launcher.getByRole('button', { name: /Trilhas Dojo/ }).click()

  const meter = page.getByTestId('hud-progress')
  await expect(meter).toHaveAttribute('role', 'progressbar')
  await expect(meter).toHaveAttribute('aria-valuetext', '66% concluído')
  await expect(meter).toHaveAttribute('aria-valuenow', '66')
  // Leitura textual "X/Y missões" adjacente (nunca só barra).
  await expect(page.locator('.sidebar-goal strong')).toContainText('2 de 3 missões')
})

test('w7-4: smoke responsivo 375/768/1280 com screenshots + alvos ≥44px — AID-5190/W7', async ({
    page,
  }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1280')
  await page.goto('/')
  await seedOnboarded(page)
  for (const width of [375, 768, 1280] as const) {
    await page.setViewportSize({ width, height: width === 375 ? 667 : 800 })
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('hud-progress').first()).toBeVisible()
    await page.screenshot({
      fullPage: true,
      path: test.info().outputPath(`w7-hud-${width}.png`),
    })
  }

  // B6 (§7.3): alvo de toque ≥44px nos controles visíveis do HUD no mobile.
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/', { waitUntil: 'networkidle' })
  const undersized = await page.evaluate(() => {
    const out: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>("button, a[href], input:not([type='hidden'])")) {
      if (el.offsetParent === null && el.getClientRects().length === 0) continue
      if (el.disabled) continue
      const rect = el.getBoundingClientRect()
      if (rect.height > 0 && (rect.height < 44 || rect.width < 44)) {
        out.push(`${el.tagName}#${el.id}.${el.className} ${Math.round(rect.width)}x${Math.round(rect.height)}`)
      }
    }
    return out
  })
  expect(undersized, `controles <44px no HUD@375: ${undersized.join(', ')}`).toEqual([])
})

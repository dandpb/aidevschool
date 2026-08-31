// Guards the pilot deploy: every mission must mount from the OS's own origin,
// with no dev server running. The dev-server suite in ../tests cannot catch a
// broken deploy, because it starts each runtime on its own localhost port —
// which is exactly how a built OS shipped with dead mission iframes.
import { expect, test } from '@playwright/test'
import type { FrameLocator } from '@playwright/test'
import { bucketOf } from '../../voxelDojo/game-02-warehouse/src/sim/hash'

async function enterSchool(page: import('@playwright/test').Page) {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'O que você quer conseguir fazer com IA?' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await expect(page.getByRole('heading', { name: 'Aprenda uma coisa útil agora.' })).toBeVisible()
}

// The assertion that matters: the frame's URL is on the host origin (i.e. the
// bundled /apps/ path won), and content inside it actually rendered. A frame
// pointing at a dev port fails the first check; a frame that failed to load
// fails the second.
async function expectMissionMounted(
  page: import('@playwright/test').Page,
  iframeTitle: string,
  innerContent: RegExp,
) {
  const frameElement = page.locator(`iframe[title="${iframeTitle}"]`)
  const frame = page.frameLocator(`iframe[title="${iframeTitle}"]`)

  await expect(frameElement).toBeVisible({ timeout: 30_000 })
  // Wait for runtime content before reading iframe attributes. On slower CI
  // hosts the iframe element can appear while launchMission is still saving
  // local state and swapping the mission shell.
  await expect(frame.locator('body')).toContainText(innerContent, { timeout: 30_000 })

  await expect(frameElement).toHaveAttribute('src', /.+/)
  const src = await frameElement.getAttribute('src')
  expect(src, 'mission iframe has a src').toBeTruthy()
  const origin = new URL(src as string, page.url()).origin
  expect(origin, 'mission must be served from the OS origin, not a dev server').toBe(
    new URL(page.url()).origin,
  )
}

async function answerWarehouse(frame: FrameLocator, correct: boolean): Promise<void> {
  const status = frame.getByTestId('hud-status')
  const first = await status.textContent()
  const count = first?.match(/de (\d+):/)?.[1]
  if (count === undefined) throw new Error('Warehouse crate count was not visible')
  const shelfCount = await frame.locator('[data-testid^="shelf-"]').count()
  for (let index = 0; index < Number(count); index += 1) {
    const current = await status.textContent()
    const key = current?.match(/: (.+) — clique/)?.[1]
    if (key === undefined) throw new Error('Warehouse key was not visible')
    const expected = bucketOf(key, shelfCount)
    await frame
      .getByTestId(`shelf-${correct ? expected : (expected + 1) % shelfCount}`)
      .dispatchEvent('click')
  }
}

test('readiness os-onboarding-track-choice and os-literacy-hosted-mission: IA Prática mission mounts from the bundled build', async ({ page }) => {
  await enterSchool(page)
  const startMission = page.getByRole('button', { name: /Começar missão|Revisar agora|Continuar missão/ })
  await startMission.scrollIntoViewIfNeeded()
  await expect(startMission).toBeVisible()
  await startMission.click()
  await expect(page).toHaveURL(/\/mission\//)
  await expectMissionMounted(
    page,
    'Missão IA não é uma fonte de verdade',
    /IA não é uma fonte de verdade/,
  )
})

test('readiness os-voxel-hosted-missions and os-verification-recovery: hosted simulation mounts from the bundled build and reports the verifier honestly', async ({
  page,
}) => {
  await enterSchool(page)
  await page.goto('/mission/dev/game-02-warehouse')
  await expectMissionMounted(
    page,
    'Missão WAREHOUSE: Key-Value Store (in-memory)',
    /Hash|shelf|WAREHOUSE/i,
  )

  // No local verifier bridge exists in a static deploy. The host must say so
  // rather than imply mastery — producer != verifier survives the pilot build.
  await expect(page.getByText('Ainda não enviada', { exact: true })).toBeVisible()
})

test('os-voxel-hosted-missions: the published PIPELINE PLANT mission mounts from the bundled build', async ({
  page,
}) => {
  await enterSchool(page)
  await page.goto('/mission/dev/game-06-pipeline-plant')
  await expectMissionMounted(
    page,
    'Missão PIPELINE PLANT: File Upload/Processing Pipeline',
    /L1|tank|PIPELINE/i,
  )
  await expect(page.getByText('Ainda não enviada', { exact: true })).toBeVisible()
})

test('os-voxel-hosted-missions: the published CHECKPOINT CITY mission mounts from the bundled build', async ({
  page,
}) => {
  await enterSchool(page)
  await page.goto('/mission/dev/game-07-checkpoint-city')
  await expectMissionMounted(
    page,
    'Missão CHECKPOINT CITY: REST API with Auth',
    /L1|city|CHECKPOINT/i,
  )
  await expect(page.getByText('Ainda não enviada', { exact: true })).toBeVisible()
})

test('os-voxel-hosted-missions: the published TIMELINE TOWER mission mounts from the bundled build', async ({
  page,
}) => {
  await enterSchool(page)
  await page.goto('/mission/dev/game-08-timeline-tower')
  await expectMissionMounted(
    page,
    'Missão TIMELINE TOWER: Event-Driven Order System',
    /L1|tower|TIMELINE/i,
  )
  await expect(page.getByText('Ainda não enviada', { exact: true })).toBeVisible()
})

test('a corrected WAREHOUSE retry supersedes the failed attempt verification state', async ({ page }) => {
  await enterSchool(page)
  await page.goto('/mission/dev/game-02-warehouse')
  const frame = page.frameLocator('iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]')
  await frame.getByTestId('start').dispatchEvent('click')

  await answerWarehouse(frame, false)
  await expect(frame.getByTestId('hud-status')).toContainText('ainda não atendido')
  await frame.getByTestId('retry').dispatchEvent('click')
  await answerWarehouse(frame, true)

  await expect(page.getByText('Verificador indisponível', { exact: true })).toBeVisible()
  await expect(page.getByText('Evidência rejeitada', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Voltar ao hub' }).click()
  await expect(page.getByText('Temporariamente indisponível', { exact: true })).toBeVisible()
})

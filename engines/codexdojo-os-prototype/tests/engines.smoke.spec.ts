import { expect, test, type Page } from '@playwright/test'

async function openEngineHub(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Atividades' }).click()
  const launcher = page.getByRole('dialog', { name: 'Lançador de aplicativos' })
  await launcher.getByRole('textbox', { name: 'Buscar aplicativos ou fundamentos' }).fill('Engine Hub')
  await launcher.getByRole('button', { name: /Engine Hub/ }).click()
  await expect(page.getByRole('button', { name: 'Usar codexDojo Dashboard' })).toBeVisible()
}

test('executes every allowlisted local engine action inside the OS', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1280')
  await openEngineHub(page)

  await page.getByRole('button', { name: 'Usar minimaxDojo Tutor Core' }).click()
  await page.getByRole('button', { name: 'Executar contrato de referência' }).click()
  await expect(page.getByRole('status')).toContainText('Ran 2 tests')
  await expect(page.getByRole('status')).toContainText('OK')

  await page.getByRole('button', { name: 'Usar MiniMax Evolution Engine' }).click()
  await page.getByRole('button', { name: 'Validar PhaseRunner' }).click()
  await expect(page.getByRole('status')).toContainText('PASS test_phaserunner_interface')

  await page.getByRole('button', { name: 'Usar OpenClaw' }).click()
  await page.getByRole('button', { name: 'Pré-visualizar checklist' }).click()
  await expect(page.getByRole('status')).toContainText('OpenClaw checklist preview')
  await expect(page.getByRole('status')).toContainText('source: learner/pipeline_status.yaml')
})

test('keeps Engine Hub operable at the configured viewport', async ({ page }, testInfo) => {
  await openEngineHub(page)
  await page.getByRole('button', { name: 'Modo Aprender', exact: true }).click()
  await expect(page.locator('.learning-rail')).toHaveCount(0)
  await page.getByRole('button', { name: 'Usar PixelDojo Quest' }).click()

  await expect(page.getByRole('region', { name: 'Área do motor selecionado' })).toBeVisible()
  await expect(page.getByTitle('PixelDojo Quest integrado')).toBeVisible()
  await expect(
    page.frameLocator('iframe[title="PixelDojo Quest integrado"]').getByRole('button', { name: 'Orbita 3D' }),
  ).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `qa/${testInfo.project.name}-engine-hub.png`, fullPage: true })
})

test('operates the real dashboard, PixelQuest, and HASH RING inside Engine Hub', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1280')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openEngineHub(page)

  await page.getByRole('button', { name: 'Usar codexDojo Dashboard' }).click()
  const dashboard = page.frameLocator('iframe[title="codexDojo Dashboard integrado"]')
  await expect(dashboard.getByRole('heading', { name: 'codexDojo' })).toBeVisible()
  await page.evaluate(() => navigator.clipboard.writeText(''))
  await dashboard.getByRole('button', { name: 'Ver agentes' }).click()
  await dashboard.getByRole('button', { name: 'Copiar prompt' }).click()
  await expect(dashboard.getByRole('button', { name: 'Copiar prompt' })).toContainText('Copiado')
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('MAESTRO')

  await page.getByRole('button', { name: 'Usar PixelDojo Quest' }).click()
  const pixel = page.frameLocator('iframe[title="PixelDojo Quest integrado"]')
  await expect(pixel.getByRole('button', { name: 'Orbita 3D' })).toBeVisible()
  await pixel.getByRole('button', { name: 'Orbita 3D' }).click()
  await pixel.getByRole('button', { name: 'Abrir lab' }).click()
  await pixel.locator('canvas').click()
  await pixel.locator('body').press('e')
  await expect(pixel.getByRole('button', { name: 'Abrir treino' })).toBeVisible()
  await pixel.locator('body').press('Enter')
  await expect(pixel.getByText('Treino de token bucket')).toBeVisible()
  await pixel.locator('body').press('Enter')
  for (const action of ['z', 'z', 'x', 'z', 'z', 'x', 'z', 'z', 'x', 'z', 'z', 'x']) {
    await pixel.locator('body').press(action)
  }
  await expect(pixel.getByText('Evidencia PASS emitida')).toBeVisible()
  await expect(page.locator('.embedded-evidence')).toContainText('01_rate_limiter')
  await expect(page.locator('.embedded-evidence')).toContainText('Verificação independente obrigatória')

  await page.getByRole('button', { name: 'Usar voxelDojo' }).click()
  const voxel = page.frameLocator('iframe[title="voxelDojo integrado"]')
  await expect(voxel.getByTestId('hud-title')).toContainText('L1')
  await voxel.getByTestId('start').click()
  for (let index = 0; index < 12; index += 1) {
    const ownerId = await voxel.locator('body').evaluate(() => {
      const hook = window.__hashRing
      if (hook === undefined) throw new Error('HASH RING hook unavailable')
      const key = hook.game.snapshot.keys[hook.game.snapshot.pendingKeyIndex]
      return key === undefined ? null : hook.game.ownerOfKey(key)
    })
    if (ownerId === null) break
    await voxel.getByTestId(`station-${ownerId}`).click()
  }
  await expect(voxel.getByTestId('hud-status')).toContainText('cleared')
  expect(await voxel.locator('body').evaluate(() => window.__voxelDojoEvidence?.length ?? 0)).toBe(1)
  await expect(page.locator('.embedded-evidence')).toContainText('voxeldojo')
  await expect(page.locator('.embedded-evidence')).toContainText('Verificação independente obrigatória')

  await page.screenshot({ path: 'qa/desktop-1280-engine-hub.png', fullPage: true })
})

import { expect, test } from '@playwright/test'
import { completeLiteracyMission } from './support/literacyMission'

test('completes l02 through the mission-first host without changing canonical mastery', async ({
  page,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'O que você quer conseguir fazer com IA?' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Entrar na escola' }).click()

  await expect(page.getByRole('heading', { name: 'Aprenda uma coisa útil agora.' })).toBeVisible()
  const canonicalLabel = await page.getByText(/\d+ competências verificadas/).textContent()
  const canonicalMastery = canonicalLabel?.match(/\d+/)?.[0]
  expect(canonicalMastery).toBeTruthy()
  const startMission = page.getByRole('button', { name: 'Começar missão' })
  await startMission.scrollIntoViewIfNeeded()
  await expect(startMission).toBeVisible()
  await startMission.click()

  const mission = page.frameLocator('iframe[title="Missão IA não é uma fonte de verdade"]')
  await expect(
    mission.getByRole('heading', { name: 'IA não é uma fonte de verdade' }),
  ).toBeVisible()
  // AID-1153 (retrofit f70205de): l01–l07 carry three activities, so the
  // walkthrough loops next-activity until finish-lesson like chapter-continuity.
  await completeLiteracyMission(page, 'l02', { returnToHub: false })

  await expect(mission.getByTestId('result-screen')).toBeVisible()
  await expect(page.getByTestId('completion-is-not-mastery')).toBeVisible()
  await expect(page.getByTestId('independent-verdict')).toBeVisible()
  await expect(page.getByText('O verificador independente aprovou esta evidência. O gate canônico continua separado.', { exact: true })).toBeVisible()
  await expect(
    page.getByText(`${canonicalMastery} verificadas · sem alteração local`),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Voltar ao hub' }).click()

  await expect(page.getByText('Evidência preservada', { exact: true })).toBeVisible()
  await expect(page.getByText('Verificação independente', { exact: true })).toBeVisible()
  await expect(page.getByText('Não alterada por este fluxo', { exact: true })).toBeVisible()
  // The hub queries the verifier once on mount; with the full three-activity
  // evidence set the last receipt can still be persisting, so the durable
  // verdict assertion is the post-reload one below (fresh mount re-queries).
  await page.reload()
  await expect(page.getByText('Evidência preservada', { exact: true })).toBeVisible()
  await expect(page.getByTestId('independent-verdict')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(`${canonicalMastery} competências verificadas`)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('shows independent FAIL separately from local and canonical progress', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  const canonicalLabel = await page.getByText(/\d+ competências verificadas/).textContent()
  const canonicalMastery = canonicalLabel?.match(/\d+/)?.[0]
  expect(canonicalMastery).toBeTruthy()
  await page.getByRole('button', { name: 'Começar missão' }).click()

  const mission = page.frameLocator('iframe[title="Missão IA não é uma fonte de verdade"]')
  await expect(
    mission.getByRole('heading', { name: 'IA não é uma fonte de verdade' }),
  ).toBeVisible()
  await mission.getByRole('button', { name: 'Começar missão', exact: true }).click()
  const wrongOutput = mission.getByTestId('output-out-a')
  await wrongOutput.scrollIntoViewIfNeeded()
  await wrongOutput.check({ force: true })
  await mission.getByTestId('criterion-c-fontes').check({ force: true })
  await mission.getByTestId('submit-attempt').click()

  await expect(page.getByText('O verificador indicou critérios a melhorar. A conclusão local e o XP foram preservados; o gate canônico continua separado.', { exact: true })).toBeVisible()
  await expect(page.getByText('Veredito independente: FAIL', { exact: true })).toBeVisible()
  await expect(page.getByText('Gate canônico não executado', { exact: false })).toBeVisible()
  await expect(
    page.getByText(`${canonicalMastery} verificadas · sem alteração local`, { exact: true }),
  ).toBeVisible()
})

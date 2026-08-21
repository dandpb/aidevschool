import { expect, test } from '@playwright/test'

test('readiness os-returning-recovery: cleared local state returns to onboarding without completion', async ({
  browser,
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Recomendada.*IA Prática/ }).click()
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await expect(page.getByRole('heading', { name: 'Aprenda uma coisa útil agora.' })).toBeVisible()
  const clearedContext = await browser.newContext()
  const resetPage = await clearedContext.newPage()
  await resetPage.goto('/')

  await expect(resetPage.getByRole('heading', { name: 'O que você quer conseguir fazer com IA?' })).toBeVisible()
  await expect(resetPage.getByText(/missão concluída/i)).toHaveCount(0)
  await expect(resetPage.getByText(/mastered/i)).toHaveCount(0)
  await clearedContext.close()
})

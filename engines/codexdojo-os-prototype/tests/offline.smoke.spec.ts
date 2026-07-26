import { expect, test } from '@playwright/test'

test('preserves local learning when network-backed services are unavailable', async ({ context, page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await page.getByRole('button', { name: 'Começar missão' }).click()
  const mission = page.frameLocator('iframe[title="Missão IA não é uma fonte de verdade"]')
  await expect(mission.getByTestId('start-lesson')).toBeVisible()
  await context.setOffline(true)

  const mentor = page.getByRole('complementary', { name: 'Mentor IA contextual' })
  await mentor.getByRole('button', { name: 'Explicar' }).click()
  await mentor.getByRole('button', { name: 'Pedir ajuda' }).click()
  await expect(mentor.getByText('Orientacao local deterministica · sem ferramentas')).toBeVisible()

  const queuedEvents = await page.evaluate(() => {
    const raw = localStorage.getItem('codexdojo-os.analytics.queue.v1')
    return raw === null ? [] : JSON.parse(raw) as unknown[]
  })
  expect(queuedEvents.length).toBeGreaterThan(0)

  await mission.getByTestId('start-lesson').click()
  await mission.getByTestId('output-out-b').check()
  await mission.getByTestId('criterion-c-fontes').check()
  await mission.getByTestId('criterion-c-limites').check()
  await mission.getByTestId('submit-attempt').click()
  await mission.getByTestId('finish-lesson').click()

  await expect(page.getByText('Verificador indisponível', { exact: true })).toBeVisible()
  await expect(page.getByText(/A evidência está segura/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tentar verificação novamente' })).toBeVisible()
  await expect(page.getByText(/erro de aprendizagem/i)).toHaveCount(0)
  await page.getByRole('button', { name: 'Voltar ao hub' }).click()
  await expect(page.getByText('Atividade concluída', { exact: true })).toBeVisible()

  await context.setOffline(false)
  await page.reload()
  await expect(page.getByText('Atividade concluída', { exact: true })).toBeVisible()
  await expect(page.getByText(/competências verificadas/)).toBeVisible()
})

import { expect, test } from '@playwright/test'

test('keeps contextual coaching available through policy and provider fallback', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar na escola' }).click()

  await expect(page).toHaveURL(/\/hub$/)
  const mentor = page.getByRole('complementary', { name: 'Mentor IA contextual' })
  await expect(mentor).toBeVisible()
  await expect(mentor.getByText(/sem ferramentas/)).toBeVisible()

  await mentor.getByRole('button', { name: 'Pista' }).click()
  await mentor.getByRole('button', { name: 'Pedir ajuda' }).click()
  await expect(mentor.getByText(/Antes da pista, mostre o que voce tentou/)).toBeVisible()

  await mentor.getByLabel('O que voce tentou').fill('Comparei as duas respostas e escolhi a que parecia mais completa.')
  await mentor.getByLabel('Ponto exato de confusao').fill('Nao sei qual criterio confirma a fonte.')
  await mentor.getByRole('button', { name: 'Pedir ajuda' }).click()
  await expect(mentor.getByText('Orientacao local deterministica · sem ferramentas')).toBeVisible()
  const firstGuidance = await mentor.locator('.mentor-response p').textContent()

  await mentor.getByRole('button', { name: 'Pedir ajuda' }).click()
  await expect.poll(() => mentor.locator('.mentor-response p').textContent()).not.toBe(firstGuidance)
  await expect(mentor.getByText('Pistas do provedor: 0/5')).toBeVisible()
  await expect(page).toHaveURL(/\/hub$/)

  await mentor.getByRole('button', { name: 'Explicar' }).focus()
  await page.keyboard.press('Enter')
  await expect(mentor.getByRole('button', { name: 'Explicar' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: /Começar missão|Revisar agora|Continuar missão/ }).click()
  await expect(page).toHaveURL(/\/mission\//)
  await expect(page.getByRole('complementary', { name: 'Mentor IA contextual' })).toBeVisible()
  await expect(page.getByTitle(/^Missão /)).toBeVisible()
})

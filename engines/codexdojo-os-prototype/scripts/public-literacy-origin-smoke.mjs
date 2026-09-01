import { chromium } from '@playwright/test'

const baseUrl = process.env.PUBLIC_OS_URL
if (baseUrl === undefined) throw new Error('PUBLIC_OS_URL is required')

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto(baseUrl)
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await page.getByRole('button', { name: 'Começar missão' }).click()

  const frame = page.locator('iframe[title="Missão IA não é uma fonte de verdade"]')
  await frame.waitFor({ state: 'attached' })
  const src = await frame.getAttribute('src')
  if (src === null) throw new Error('LiteracyDojo iframe has no src')

  const origin = new URL(src).origin
  if (origin !== 'https://aidevschool-literacydojo.netlify.app') {
    throw new Error(`unexpected LiteracyDojo origin: ${origin}`)
  }
  await page.frameLocator('iframe[title="Missão IA não é uma fonte de verdade"]')
    .getByRole('button', { name: 'Começar missão', exact: true })
    .waitFor({ state: 'visible' })

  console.log(JSON.stringify({ baseUrl, literacyDojoSrc: src, result: 'PASS' }, null, 2))
} finally {
  await browser.close()
}

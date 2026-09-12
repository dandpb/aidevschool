import playwright from '../../engines/codexdojo-os-prototype/node_modules/@playwright/test/index.js'

const { chromium } = playwright

const baseUrl = 'https://6a8dcaf145449f40cdd93e55--aidevschool-codexdojo-os.netlify.app'
const expectedLiteracyOrigin = 'https://aidevschool-literacydojo.netlify.app'
const screenshot = new URL('./qa-public-journey-result.png', import.meta.url).pathname

const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await page.getByRole('button', { name: 'Começar missão' }).click()

  const iframe = page.locator('iframe[title="Missão IA não é uma fonte de verdade"]')
  await iframe.waitFor({ state: 'attached' })
  const src = await iframe.getAttribute('src')
  if (!src) throw new Error('iframe sem src')
  if (new URL(src).origin !== expectedLiteracyOrigin) {
    throw new Error(`origem inesperada: ${new URL(src).origin}`)
  }

  const mission = page.frameLocator('iframe[title="Missão IA não é uma fonte de verdade"]')
  const legal = {}
  for (const [name, label] of [['termos', /termos do piloto/i], ['privacidade', /privacidade/i]]) {
    const href = await mission.getByRole('link', { name: label }).first().getAttribute('href')
    if (!href) throw new Error(`link ${name} sem href`)
    const response = await page.request.get(new URL(href, src).href)
    legal[name] = { url: response.url(), status: response.status() }
    if (response.status() !== 200) throw new Error(`${name} retornou ${response.status()}`)
  }

  await mission.getByRole('button', { name: 'Começar missão', exact: true }).click()
  await mission.getByTestId('output-out-b').click()
  await mission.getByTestId('criterion-c-fontes').click()
  await mission.getByTestId('criterion-c-limites').click()
  await mission.getByTestId('submit-attempt').click()
  await mission.getByTestId('finish-lesson').click()

  const verification = mission.getByTestId('verification-status')
  await mission.getByTestId('result-screen').waitFor({ timeout: 30_000 })
  await page.waitForTimeout(3_000)
  const resultText = await mission.getByTestId('result-screen').innerText()
  const verificationText = await verification.innerText()
  await page.screenshot({ path: screenshot, fullPage: true })
  if (/mastered/i.test(resultText)) throw new Error('UI de resultado contém mastered')
  if (!/não altera (o )?estado canônico|não altera domínio canônico/i.test(resultText)) {
    throw new Error('distinção canônica ausente no resultado')
  }
  if (!/Recibo independente:/.test(verificationText)) {
    throw new Error(`recibo independente ausente: ${verificationText}`)
  }
  console.log(JSON.stringify({
    result: 'PASS',
    baseUrl,
    iframeSrc: src,
    legal,
    verificationText,
    resultContainsMastered: /mastered/i.test(resultText),
    screenshot,
  }, null, 2))
} finally {
  await browser.close()
}

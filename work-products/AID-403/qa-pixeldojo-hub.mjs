// AID-403 QA: pixelDojo exposure — operator-only Engine Hub embeds the immutable pin
import { createRequire } from 'node:module'
const require = createRequire('/paperclip/tmp/aid306/wt/engines/codexdojo-os-prototype/package.json')
const { chromium } = require('@playwright/test')

const BASE = 'https://aidevschool-codexdojo-os.netlify.app'
const PIN = 'https://6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app/'
const results = []
const check = (id, ok, detail = '') => { results.push({ id, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail}`) }

const pr = await fetch(PIN)
check('pin-live-200', pr.status === 200, String(pr.status))
check('pin-is-immutable-deploy-permalink', /^https:\/\/[0-9a-f]{12,32}--/.test(PIN) && !PIN.startsWith('https://aidevschool-codexdojo-os.'), 'deploy-ID subdomain (not mutable alias)')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(BASE + '/?operator=1', { waitUntil: 'domcontentloaded' })
await page.getByRole('button', { name: 'Entrar na escola' }).click()
await page.waitForURL(/hub/, { timeout: 20000 })
await page.goto(BASE + '/desktop?operator=1', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)
// operator launcher has Engine Hub
await page.getByRole('button', { name: 'Todos os apps' }).click().catch(async () => {})
await page.waitForTimeout(1200)
const hubBtn = page.locator('section[aria-label="Lançador de aplicativos"]').getByRole('button', { name: /Engine Hub/i })
check('engine-hub-operator-only-visible', (await hubBtn.count()) > 0, 'operator surface ?operator=1')
if (await hubBtn.count()) {
  await hubBtn.click()
  await page.waitForTimeout(1500)
  const pixCard = page.getByRole('button', { name: /PixelDojo/i }).first()
  check('pixelDojo-card-in-hub', (await pixCard.count()) > 0, '')
  await pixCard.click().catch(() => {})
  await page.waitForTimeout(3500)
  const iframes = await page.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => f.src))
  check('pixelDojo-iframe==immutable-pin', iframes.some((s) => s.startsWith(PIN)), JSON.stringify(iframes).slice(0, 160))
}
// student surface: Engine Hub must NOT be listed
const page2 = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page2.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await page2.getByRole('button', { name: 'Entrar na escola' }).click()
await page2.waitForURL(/hub/, { timeout: 20000 })
await page2.goto(BASE + '/desktop', { waitUntil: 'domcontentloaded' })
await page2.waitForTimeout(2000)
await page2.getByRole('button', { name: 'Todos os apps' }).click().catch(async () => {})
await page2.waitForTimeout(1200)
const studentApps = await page2.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))
check('student-launcher-has-no-engine-hub', !/Engine Hub/.test(studentApps), 'operator-only app filtered for students')
const pinFrames = await page2.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => f.src).filter((s) => s.includes('6a920159')))
check('student-desktop-has-no-pin-iframe', pinFrames.length === 0, JSON.stringify(pinFrames))
await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} PASS`)
process.exit(failed.length ? 1 : 0)

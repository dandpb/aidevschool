import { chromium } from '/paperclip/tmp/aid268-qa/engines/voxelDojo/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs'

const OS = 'https://6a91fb4dc2e2cd5f4dc00b6c--aidevschool-codexdojo-os.netlify.app'
const b = await chromium.launch()
for (const app of ['warehouse', 'wormhole']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
  await p.goto(`${OS}/apps/${app}/`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)
  const r = await p.evaluate(() => {
    const clientW = document.documentElement.clientWidth
    const bad = []
    for (const el of document.querySelectorAll('body *')) {
      const rect = el.getBoundingClientRect()
      if (rect.right > clientW + 1 || rect.left < -1) {
        bad.push({ tag: el.tagName, cls: String(el.className).slice(0, 40), testid: el.dataset.testid || '', left: Math.round(rect.left), right: Math.round(rect.right), w: Math.round(rect.width), text: (el.textContent || '').trim().slice(0, 60) })
      }
    }
    const hud = document.querySelector('#hud')
    return { scrollW: document.documentElement.scrollWidth, clientW, hudW: hud ? Math.round(hud.getBoundingClientRect().width) : null, bad: bad.slice(0, 8) }
  })
  console.log(app, JSON.stringify(r, null, 1))
  await p.close()
}
await b.close()

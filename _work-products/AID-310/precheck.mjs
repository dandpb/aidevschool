// AID-310 pre-check (adapted from _work-products/AID-306/precheck.mjs)
// Pin: bbf27bb517da7ad87070a5fb1a4849fd69ce8df5 (merge: release/7426d384 + aid-298/os-landing-contrast 9fae8c6/7aaa808)
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
const require = createRequire('/paperclip/tmp/aid306/wt/engines/codexdojo-os-prototype/package.json')
const { chromium } = require('@playwright/test')

const BASE = process.env.QA_BASE_URL
const PIN = 'bbf27bb517da7ad87070a5fb1a4849fd69ce8df5'
const MANIFEST_SHA = '96a0fba7ba395d9fdb943aa67bfc8b70edcd5adc6aa9e31e20c75866b9d48104'
const OS_SHA = '4658412b9d3c8a3a4f5623178b7be03dbd43eaf10c85da062d9b1febcc966541'
const LIT_SHA = '878b051fb0f25ca82f56d8a2671822668b0b3e55c5f0c675d45495255a7abae5'
const results = []
const check = (id, ok, detail = '') => { results.push({ id, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail}`) }
const sha = (s) => createHash('sha256').update(s).digest('hex')

// 1. remote manifest identity
const mres = await fetch(`${BASE}/pilot-bundle-manifest.json`)
const mbody = await mres.text()
const manifest = JSON.parse(mbody)
check('manifest-sha256', mres.ok && sha(mbody) === MANIFEST_SHA, sha(mbody))
check('manifest-sourceRevision', manifest.sourceRevision === PIN, manifest.sourceRevision)
check('manifest-os-bytes', manifest.surfaces.os.sha256 === OS_SHA, manifest.surfaces.os.sha256.slice(0, 16))
check('manifest-literacy-unchanged', manifest.surfaces.literacydojo.sha256 === LIT_SHA, manifest.surfaces.literacydojo.sha256.slice(0, 16))

// 2. surfaces reachable
for (const p of ['/', '/apps/literacydojo/', '/apps/warehouse/', '/apps/wormhole/', '/apps/relay-station/']) {
  const r = await fetch(BASE + p)
  check(`surface-200 ${p}`, r.status === 200, String(r.status))
}

// 3. OS bundle embeds same-origin literacy pin, not the stale deploy
const osJsPath = (await (await fetch(`${BASE}/`)).text()).match(/assets\/index-[^"]*\.js/)?.[0]
const osJs = await (await fetch(`${BASE}/${osJsPath}`)).text()
check('os-embeds-same-origin-literacy', osJs.includes('/apps/literacydojo/'))
check('os-no-stale-external-pin', !osJs.includes('6a8ddc9afe6838bdcf19a465'))

// 4. embedded literacy app declares the expected contentVersion
const litJsPath = (await (await fetch(`${BASE}/apps/literacydojo/`)).text()).match(/assets\/index-[^"]*\.js/)?.[0]
const litJs = await (await fetch(`${BASE}/apps/literacydojo/${litJsPath}`)).text()
check('literacy-contentVersion-2026-08-21.1', litJs.includes('2026-08-21.1'))

// 5. AID-271 reflow fix RETAINED in published literacy CSS (regression guard)
const litCssPath = (await (await fetch(`${BASE}/apps/literacydojo/`)).text()).match(/assets\/index-[^"]*\.css/)?.[0]
const litCss = await (await fetch(`${BASE}/apps/literacydojo/${litCssPath}`)).text()
check('reflow-no-body-min-width-320', !/body\{[^}]*min-width:\s*320px/.test(litCss))
check('reflow-voxel-world-min-width-0', /\.voxel-world\{[^}]*min-width:\s*0/.test(litCss))

// 6. AID-298 contrast fix present in published OS CSS
const osCssPath = (await (await fetch(`${BASE}/`)).text()).match(/assets\/index-[^"]*\.css/)?.[0]
const osCss = await (await fetch(`${BASE}/${osCssPath}`)).text()
check('contrast-rule-published', /\.track-option\.selected small\{color:var\(--journey-primary-dark\)\}/.test(osCss), osCssPath)

// 7. live computed-style probe on the landing defect node (producer smoke;
//    independent axe PASS belongs to QA via AID-308)
const browser = await chromium.launch()
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    const sel = await page.waitForSelector('.track-option.selected small', { timeout: 20000 })
    const probe = await sel.evaluate((el) => {
      const cs = getComputedStyle(el)
      const bg = getComputedStyle(el.closest('.track-option.selected')).backgroundColor
      const lum = (c) => {
        const [r, g, b] = c.match(/\d+/g).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      const l1 = lum(cs.color); const l2 = lum(bg)
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
      return { color: cs.color, bg, ratio: Math.round(ratio * 100) / 100, text: el.textContent.slice(0, 40) }
    })
    check('contrast-computed-node', probe.color === 'rgb(31, 64, 52)', probe.color)
    check('contrast-ratio>=4.5', probe.ratio >= 4.5, `${probe.ratio}:1 on ${probe.bg} ("${probe.text}")`)
  } catch (e) {
    check('contrast-computed-node', false, e.message.slice(0, 120))
  }
  await page.close()
}

// 8. live MOTOR handshake regression: l01 + warehouse (fix must not disturb journeys)
for (const [label, path] of [['l01', '/mission/ai-pratica/l01'], ['warehouse', '/mission/dev/game-02-warehouse']]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Entrar na escola' }).click()
    await page.waitForURL(/hub/, { timeout: 20000 })
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
    let status = ''
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(4000)
      status = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').match(/MOTOR \w+/)?.[0] ?? '')
      if (status) break
    }
    check(`MOTOR ${label}`, status === 'MOTOR running', status || 'no-status')
  } catch (e) {
    check(`MOTOR ${label}`, false, e.message.slice(0, 120))
  }
  await page.close()
}
await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} PASS`)
process.exit(failed.length ? 1 : 0)

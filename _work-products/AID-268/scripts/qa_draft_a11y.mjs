/**
 * AID-268 independent QA — a11y/PT-BR/reduced-motion verification against the deployed draft.
 * Targets (pinned candidate 161f8c9):
 *   OS draft:  https://6a91fb4dc2e2cd5f4dc00b6c--aidevschool-codexdojo-os.netlify.app
 *   voxel apps (same-origin paths): /apps/warehouse/ /apps/wormhole/ /apps/relay-station/
 *   pixel-quest draft: https://6a91fafbab0b3c4e0ee36c61--singular-crostata-273e7e.netlify.app
 */
import { chromium } from '/paperclip/tmp/aid268-qa/engines/voxelDojo/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'

const OS = 'https://6a91fb4dc2e2cd5f4dc00b6c--aidevschool-codexdojo-os.netlify.app'
const PQ = 'https://6a91fafbab0b3c4e0ee36c61--singular-crostata-273e7e.netlify.app'
const APPS = [
  { name: 'warehouse', path: '/apps/warehouse/' },
  { name: 'wormhole', path: '/apps/wormhole/' },
  { name: 'relay-station', path: '/apps/relay-station/' },
]
const VIEWPORTS = [320, 375, 768, 1280]
const OUT = '/paperclip/instances/default/projects/f2527e0b-9532-456c-bef8-b7380cd34f9c/3cbab3d6-45a5-478c-9212-e1484aacbb04/_default/_work-products/AID-268'
mkdirSync(OUT + '/shots', { recursive: true })

const ENGLISH_HINTS = /\b(start|wave|submit|retry|next|level|press|cleared|failed|evidence|emit|predict|collision|safe|code expected|redirect|planet|exit|type the|will it|pick the|incoming|metrics|stamped)\b/i
const results = { startedAt: new Date().toISOString(), apps: {}, pixelquest: {}, host: {}, notes: [] }

async function appChecks(page, url, name, ctx) {
  const r = {}
  await page.goto(url, { waitUntil: 'networkidle' })
  r.lang = await page.evaluate(() => document.documentElement.lang)
  const status = page.locator('[data-testid="hud-status"]')
  r.statusCount = await status.count()
  if (r.statusCount === 1) {
    r.statusRole = await status.getAttribute('role')
    r.statusAriaLive = await status.getAttribute('aria-live')
  }
  // exactly one live region in the HUD (no double announcement)
  r.liveRegionCount = await page.evaluate(() =>
    document.querySelectorAll('#hud [aria-live], #hud [role="status"], #hud [role="alert"]').length)
  // HUD buttons >= 44x44 computed
  r.buttons = await page.evaluate(() => {
    const out = []
    for (const b of document.querySelectorAll('#hud button')) {
      const cs = getComputedStyle(b)
      const rect = b.getBoundingClientRect()
      out.push({ text: (b.textContent || '').trim().slice(0, 30), w: Math.round(rect.width), h: Math.round(rect.height) })
    }
    return out
  })
  r.buttonsMin = r.buttons.length ? Math.min(...r.buttons.map(b => Math.min(b.w, b.h))) : null
  r.buttonsBelow44 = r.buttons.filter(b => Math.min(b.w, b.h) < 44)
  // HUD visible text English heuristic
  r.hudText = await page.evaluate(() => {
    const hud = document.querySelector('#hud')
    return hud ? hud.innerText.replace(/\s+/g, ' ').trim().slice(0, 400) : ''
  })
  r.englishHints = [...new Set(r.hudText.match(ENGLISH_HINTS) || [])]
  // focus-steal + single live-region update on status change
  try {
    await page.getByTestId('btn-start').click({ timeout: 3000 }).catch(() => page.locator('#hud button').first().click())
  } catch { /* briefing buttons may differ */ }
  const focusBefore = await page.evaluate(() => document.activeElement ? (document.activeElement.tagName + ':' + (document.activeElement.dataset.testid || '')) : 'none')
  await page.waitForTimeout(1200)
  const focusAfter = await page.evaluate(() => document.activeElement ? (document.activeElement.tagName + ':' + (document.activeElement.dataset.testid || '')) : 'none')
  r.focusStableAcrossStatusChange = focusBefore === focusAfter || focusBefore === 'none'
  r.statusTextAfterStart = (await status.textContent())?.slice(0, 120)
  // reduced motion (standalone): computed durations must be 0s on every HUD element
  const rm = await ctx.newPage()
  await rm.emulateMedia({ reducedMotion: 'reduce' })
  await rm.goto(url, { waitUntil: 'networkidle' })
  r.reducedMotionComputed = await rm.evaluate(() => {
    const bad = []
    for (const el of document.querySelectorAll('#hud, #hud *')) {
      const cs = getComputedStyle(el)
      const ad = cs.animationDuration, td = cs.transitionDuration
      if ((ad && ad !== '0s') || (td && td !== '0s')) bad.push({ tag: el.tagName, cls: el.className, ad, td })
    }
    return { nonZero: bad.slice(0, 5), checked: document.querySelectorAll('#hud, #hud *').length }
  })
  r.cssHasReducedMotionQuery = await rm.evaluate(() =>
    [...document.styleSheets].some(s => { try { return [...s.cssRules].some(rule => rule.media && [...rule.media].includes('(prefers-reduced-motion: reduce)')) } catch { return false } }))
  // viewports: no essential horizontal scroll; HUD stacked at 320
  r.viewports = {}
  for (const w of VIEWPORTS) {
    const vp = await ctx.newPage()
    await vp.setViewportSize({ width: w, height: Math.round(w * 1.4) })
    await vp.goto(url, { waitUntil: 'networkidle' })
    const m = await vp.evaluate(() => {
      const de = document.scrollingElement
      const hud = document.querySelector('#hud')
      const hudRect = hud ? hud.getBoundingClientRect() : null
      return {
        scrollW: de.scrollWidth, clientW: de.clientWidth,
        bodyScrollW: document.body.scrollWidth, bodyClientW: document.body.clientWidth,
        hudVisible: !!hud && hud.offsetHeight > 0,
        hudTop: hudRect ? Math.round(hudRect.top) : null,
        hudWidth: hudRect ? Math.round(hudRect.width) : null,
        viewport: window.innerWidth,
      }
    })
    m.hOverflow = m.scrollW - m.clientW
    m.pass = m.hOverflow <= 1 && m.hudVisible
    r.viewports[w] = m
    if (w === 320) await vp.screenshot({ path: `${OUT}/shots/${name}-320.png`, fullPage: false })
    await vp.close()
  }
  await rm.close()
  return r
}

const browser = await chromium.launch()
try {
  for (const app of APPS) {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    results.apps[app.name] = await appChecks(page, OS + app.path, app.name, ctx)
    await ctx.close()
  }

  // pixel-quest draft: lang + reduced-motion CSS present + computed
  const ctx2 = await browser.newContext()
  const pqPage = await ctx2.newPage()
  const pq = {}
  await pqPage.goto(PQ, { waitUntil: 'domcontentloaded' })
  pq.lang = await pqPage.evaluate(() => document.documentElement.lang)
  pq.cssLinks = await pqPage.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href))
  let css = ''
  for (const href of pq.cssLinks) css += await (await fetch(href)).text()
  pq.cssHasReducedMotion = css.includes('prefers-reduced-motion')
  const rmPq = await ctx2.newPage()
  await rmPq.emulateMedia({ reducedMotion: 'reduce' })
  await rmPq.goto(PQ, { waitUntil: 'domcontentloaded' })
  pq.reducedMotionComputed = await rmPq.evaluate(() => {
    const els = document.querySelectorAll('button, .hud, #hud, [class*=hud], body *')
    let bad = 0, checked = 0
    for (const el of els) {
      const cs = getComputedStyle(el)
      if (cs.animationName !== 'none' || cs.animationDuration !== '0s') { if (cs.animationDuration !== '0s') bad++ }
      checked++
    }
    return { badAnimated: bad, checked }
  })
  results.pixelquest = pq

  // host embedding: OS draft with reduced motion; iframe apps inherit emulation
  const hostCtx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 375, height: 700 } })
  const host = await hostCtx.newPage()
  await host.goto(OS, { waitUntil: 'domcontentloaded' })
  results.host.lang = await host.evaluate(() => document.documentElement.lang)
  results.host.iframes = await host.evaluate(() => [...document.querySelectorAll('iframe')].map(f => f.getAttribute('src')))
  await host.waitForTimeout(2500)
  for (const app of APPS) {
    const frame = host.frames().find(f => f.url().includes(app.path))
    if (!frame) { results.host[app.name] = { found: false }; continue }
    results.host[app.name] = await frame.evaluate(() => ({
      lang: document.documentElement.lang,
      statusRole: document.querySelector('[data-testid="hud-status"]')?.getAttribute('role'),
      statusAriaLive: document.querySelector('[data-testid="hud-status"]')?.getAttribute('aria-live'),
      nonZeroDurations: [...document.querySelectorAll('#hud, #hud *')].filter(el => {
        const cs = getComputedStyle(el)
        return (cs.animationDuration !== '0s') || (cs.transitionDuration !== '0s')
      }).length,
    }))
  }
  await host.screenshot({ path: `${OUT}/shots/os-host-375-rm.png` })

  // contrast AA from computed tokens (per app, standalone)
  const ctx3 = await browser.newContext()
  const tokPage = await ctx3.newPage()
  for (const app of APPS) {
    await tokPage.goto(OS + app.path, { waitUntil: 'networkidle' })
    results.apps[app.name].tokens = await tokPage.evaluate(() => {
      const cs = getComputedStyle(document.documentElement)
      const t = {}
      for (const k of ['--vx-bg', '--vx-surface', '--vx-surface-raised', '--vx-text', '--vx-text-muted', '--vx-text-dim', '--vx-action', '--vx-focus', '--vx-status', '--vx-success', '--vx-error'])
        t[k] = cs.getPropertyValue(k).trim()
      return t
    })
  }
} finally {
  await browser.close()
}
writeFileSync(`${OUT}/qa-draft-a11y-results.json`, JSON.stringify(results, null, 2))
console.log(JSON.stringify({ apps: Object.fromEntries(Object.entries(results.apps).map(([k, v]) => [k, {
  lang: v.lang, statusRole: v.statusRole, live: v.statusAriaLive, liveRegionCount: v.liveRegionCount,
  buttonsMin: v.buttonsMin, below44: v.buttonsBelow44.length, englishHints: v.englishHints,
  rmNonZero: v.reducedMotionComputed.nonZero.length, rmQuery: v.cssHasReducedMotionQuery,
  focusStable: v.focusStableAcrossStatusChange,
  v320pass: v.viewports[320].pass, v320overflow: v.viewports[320].hOverflow, v375: v.viewports[375].pass, v768: v.viewports[768].pass, v1280: v.viewports[1280].pass,
}])), pixelquest: results.pixelquest, host: results.host }, null, 2))

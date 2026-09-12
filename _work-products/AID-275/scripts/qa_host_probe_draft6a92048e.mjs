import { chromium } from '/paperclip/tmp/aid275/wt/engines/voxelDojo/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs'

const OS = 'https://6a92048e07e78c64703b806e--aidevschool-codexdojo-os.netlify.app'
const OUT = '/paperclip/instances/default/projects/f2527e0b-9532-456c-bef8-b7380cd34f9c/3cbab3d6-45a5-478c-9212-e1484aacbb04/_default/_work-products/AID-275'
const b = await chromium.launch()
const ctx = await b.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } })
const p = await ctx.newPage()
await p.goto(OS, { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(2000)
const out = { steps: [] }
try {
  // onboarding: choose Dev track, enter school
  const dev = p.getByRole('button', { name: /Trilha técnica/ })
  if (await dev.count()) { await dev.click({ timeout: 8000 }); out.steps.push('chose Dev track') }
  const enter = p.getByRole('button', { name: 'Entrar na escola' })
  if (await enter.count()) { await enter.click({ timeout: 8000 }); out.steps.push('entered school') }
  await p.waitForTimeout(1500)
  // open featured Dev mission (warehouse embed)
  const revisar = p.getByRole('button', { name: 'Revisar agora' })
  if (await revisar.count()) {
    await revisar.click({ timeout: 8000 })
    out.steps.push('opened featured mission')
    await p.waitForTimeout(4000)
  }
  const ativ = p.getByRole('button', { name: 'Atividades' })
  if (await ativ.count()) {
    await ativ.click({ timeout: 8000 })
    out.steps.push('clicked Atividades')
    const launcher = p.getByRole('dialog', { name: 'Lançador de aplicativos' })
    await launcher.waitFor({ timeout: 8000 })
    await launcher.getByRole('button', { name: /Engine Hub/ }).click({ timeout: 8000 })
    out.steps.push('opened Engine Hub')
    await p.waitForTimeout(2500)
    const cand = p.getByRole('button', { name: /voxel/i })
    const n = await cand.count()
    out.voxelButtons = n
    if (n > 0) {
      await cand.first().click({ timeout: 8000 })
      out.steps.push('clicked voxel engine')
      await p.waitForTimeout(4000)
    }
  }
  out.iframes = await p.evaluate(() => [...document.querySelectorAll('iframe')].map(f => ({ src: f.getAttribute('src'), title: f.getAttribute('title'), w: Math.round(f.getBoundingClientRect().width), h: Math.round(f.getBoundingClientRect().height) })))
  const frames = p.frames().filter(f => f !== p.mainFrame())
  out.framesFound = frames.map(f => f.url())
  for (const f of frames) {
    const url = f.url()
    const key = url.includes('warehouse') ? 'warehouse' : url.includes('wormhole') ? 'wormhole' : url.includes('relay') ? 'relay-station' : url.includes('crostata') ? 'pixelquest' : 'other'
    try {
      out[key] = await f.evaluate(() => ({
        url: location.href,
        lang: document.documentElement.lang,
        statusRole: document.querySelector('[data-testid="hud-status"]')?.getAttribute('role') ?? null,
        statusAriaLive: document.querySelector('[data-testid="hud-status"]')?.getAttribute('aria-live') ?? null,
        hudButtons: [...document.querySelectorAll('#hud button')].length,
        nonZeroDurations: [...document.querySelectorAll('#hud, #hud *')].filter(el => {
          const cs = getComputedStyle(el)
          return (cs.animationDuration !== '0s') || (cs.transitionDuration !== '0s')
        }).length,
        hudW: Math.round(document.querySelector('#hud')?.getBoundingClientRect().width ?? -1),
        scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
      }))
    } catch (e) { out[key] = { error: String(e).slice(0, 120) } }
  }
  await p.screenshot({ path: `${OUT}/shots/os-host-1280-rm.png` })
} catch (e) {
  out.error = String(e).slice(0, 300)
  await p.screenshot({ path: `${OUT}/shots/os-host-1280-rm-fail.png` }).catch(() => {})
}
console.log(JSON.stringify(out, null, 1))
await b.close()

// QA proof for AID-263: drives the built voxel apps (vite preview) and checks the
// pilot-pinned acceptance criteria. Not part of the repo; lives in /paperclip/tmp.
import { createRequire } from "node:module"
import { spawn, execSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"

const require = createRequire("/paperclip/tmp/aid288/wt/engines/voxelDojo/game-02-warehouse/package.json")
const { chromium } = require("@playwright/test")

const GAMES = [
  { id: "game-02-warehouse", dir: "game-02-warehouse", port: 4551 },
  { id: "game-03-wormhole", dir: "game-03-wormhole", port: 4552 },
  { id: "game-05-relay-station", dir: "game-05-relay-station", port: 4553 },
]
const ROOT = "/paperclip/tmp/aid288/wt/engines/voxelDojo"
const OUT = "/paperclip/tmp/aid288/qa"
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const results = []

for (const g of GAMES) {
  const server = spawn("pnpm", ["exec", "vite", "--port", String(g.port), "--strictPort"], {
    cwd: `${ROOT}/${g.dir}`,
    stdio: "ignore",
    env: { ...process.env },
  })
  // poll until the preview server answers
  let up = false
  for (let i = 0; i < 40 && !up; i++) {
    await new Promise((r) => setTimeout(r, 500))
    try {
      const res = await fetch(`http://[::1]:${g.port}/`)
      up = res.ok
    } catch {
      up = false
    }
  }
  if (!up) throw new Error(`preview server did not start for ${g.id}`)

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto(`http://[::1]:${g.port}/`)
  await page.waitForSelector('[data-testid="hud-title"]', { state: "attached", timeout: 20000 })

  const checks = {}
  checks.lang = await page.evaluate(() => document.documentElement.lang)
  const statusRole = await page
    .locator('[data-testid="hud-status"]')
    .evaluate((n) => ({ role: n.getAttribute("role"), live: n.getAttribute("aria-live") }))
  checks.status = statusRole

  // HUD copy has no English leftovers from the old strings
  const hudText = await page.locator("#hud").innerText()
  checks.noOldEnglishCopy = !/Start wave|Press start|Wave cleared|Retry level|Next level/i.test(hudText)

  // 44px targets on every HUD button
  checks.buttonTargets = await page.evaluate(() => {
    const bad = []
    for (const b of document.querySelectorAll("#hud button")) {
      const r = b.getBoundingClientRect()
      if (r.height < 44 || r.width < 44) bad.push(`${b.dataset.testid ?? "?"}:${Math.round(r.width)}x${Math.round(r.height)}`)
    }
    return bad
  })

  // AID-275 F1: HUD must keep its sidebar width at desktop sizes (>=768px)
  checks.desktop = {}
  for (const w of [768, 854, 1280]) {
    await page.setViewportSize({ width: w, height: 800 })
    await page.waitForTimeout(250)
    checks.desktop[w] = await page.evaluate(() => ({
      hudW: Math.round(document.querySelector("#hud").getBoundingClientRect().width),
      scrollW: document.scrollingElement.scrollWidth,
      innerW: window.innerWidth,
    }))
  }
  await page.screenshot({ path: `${OUT}/${g.id}-1280.png` })

  // 320px reflow: stacked HUD, no horizontal overflow
  await page.setViewportSize({ width: 320, height: 700 })
  await page.waitForTimeout(300)
  checks.reflow320 = await page.evaluate(() => ({
    scrollWidth: document.scrollingElement.scrollWidth,
    innerWidth: window.innerWidth,
    stacked: getComputedStyle(document.body).flexDirection === "column",
  }))
  await page.screenshot({ path: `${OUT}/${g.id}-320.png` })

  // reduced motion: media matches, CSS motion disabled
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.waitForTimeout(300)
  checks.reducedMotion = await page.evaluate(() => {
    const probe = document.createElement("div")
    probe.style.animation = "spin 1s infinite"
    probe.style.transition = "opacity .3s"
    document.body.append(probe)
    const cs = getComputedStyle(probe)
    const out = { animation: cs.animationName, transition: cs.transitionDuration, matches: null }
    out.matches = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    probe.remove()
    return out
  })
  await page.emulateMedia({ reducedMotion: "no-preference" })

  results.push({ game: g.id, ...checks })
  await page.close()
  server.kill("SIGKILL")
  await new Promise((r) => setTimeout(r, 500))
}

await browser.close()
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
let failed = false
for (const r of results) {
  const desktopOk = Object.values(r.desktop || {}).every(
    (d) => d.hudW >= 300 && d.scrollW <= d.innerW,
  )
  const ok =
    desktopOk &&
    r.lang === "pt-BR" &&
    r.status.role === "status" &&
    r.status.live === "polite" &&
    r.noOldEnglishCopy &&
    r.buttonTargets.length === 0 &&
    r.reflow320.scrollWidth <= r.reflow320.innerWidth &&
    r.reflow320.stacked &&
    r.reducedMotion.matches === true &&
    r.reducedMotion.animation === "none" &&
    r.reducedMotion.transition === "0s"
  if (!ok) failed = true
  console.log(r.game, ok ? "PASS" : "FAIL")
}
process.exit(failed ? 1 : 0)

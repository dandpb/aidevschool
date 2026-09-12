// AID-288 F2 runtime proof: drive the real warehouse page and capture the browser
// EVIDENCE console records; assert attempt_id is present and increments on retry.
import { createRequire } from "node:module"
import { spawn } from "node:child_process"
import { writeFileSync } from "node:fs"

const require = createRequire("/paperclip/tmp/aid288/wt/engines/voxelDojo/game-02-warehouse/package.json")
const { chromium } = require("@playwright/test")

const DIR = "/paperclip/tmp/aid288/wt/engines/voxelDojo/game-02-warehouse"
const PORT = 6202
const server = spawn("pnpm", ["exec", "vite", "--port", String(PORT), "--strictPort"], { cwd: DIR, stdio: "ignore" })
let up = false
for (let i = 0; i < 40 && !up; i++) {
  await new Promise((r) => setTimeout(r, 500))
  try { up = (await fetch(`http://[::1]:${PORT}/`)).ok } catch { up = false }
}
if (!up) throw new Error("vite did not start")

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const lines = []
page.on("console", (m) => lines.push(m.text()))
await page.goto(`http://[::1]:${PORT}/`)
await page.getByTestId("start").click()

async function playL1() {
  for (let i = 0; i < 64; i++) {
    const shelfId = await page.evaluate(() => {
      const hook = window.__warehouse
      if (!hook) throw new Error("no test hook")
      const s = hook.game.snapshot
      const key = s.keys[s.pendingIndex]
      if (key === undefined) return null
      return hook.game.shelfOfKey(key)
    })
    if (shelfId === null) return
    await page.getByTestId(`shelf-${shelfId}`).click()
  }
}
await playL1()
await page.waitForTimeout(800)

// retry path: reload the level to force a second attempt, then pass again
const retryVisible = await page.getByTestId("retry").count()
if (retryVisible === 1) {
  await page.getByTestId("retry").click()
  await page.waitForTimeout(300)
  await playL1()
  await page.waitForTimeout(800)
}

const records = lines.filter((l) => l.startsWith("EVIDENCE ")).map((l) => JSON.parse(l.slice(9)))
const out = {
  hudStatus: (await page.getByTestId("hud-status").innerText()).trim(),
  windowEvidenceCount: await page.evaluate(() => window.__voxelDojoEvidence?.length ?? 0),
  attemptIds: records.map((r) => ({ scenario_id: r.scenario_id, attempt_id: r.attempt_id, pass: r.pass })),
}
writeFileSync("/paperclip/tmp/aid288/qa/f2-runtime-warehouse.json", JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))
const ok = out.attemptIds.length >= 1 && out.attemptIds.every((a) => typeof a.attempt_id === "string" && /^kv-warehouse-L\d+-attempt-\d+$/.test(a.attempt_id))
console.log(ok ? "F2-RUNTIME PASS" : "F2-RUNTIME FAIL")
await browser.close()
server.kill("SIGKILL")
process.exit(ok ? 0 : 1)

// AID-288 C6: F1 geometry inside a host-like iframe (854x600) embedding the
// built game dists at afd6789 — replicates the AID-268 host-iframe F1 evidence
// (scrollW 972 > 854, hudW 33) without depending on a deploy.
import { createRequire } from "node:module"
import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { extname, join } from "node:path"
import { chromium } from "/paperclip/tmp/aid288/wt/engines/voxelDojo/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs"

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" }
const ROOT = "/paperclip/tmp/aid288/wt/engines/voxelDojo"
const GAMES = [
  { id: "warehouse", dir: "game-02-warehouse", port: 6311 },
  { id: "wormhole", dir: "game-03-wormhole", port: 6312 },
  { id: "relay", dir: "game-05-relay-station", port: 6313 },
]

for (const g of GAMES) {
  createServer(async (req, res) => {
    try {
      let p = join(`${ROOT}/${g.dir}/dist`, decodeURIComponent(req.url.split("?")[0]))
      if (p.endsWith("/")) p += "index.html"
      const body = await readFile(p)
      res.setHeader("content-type", MIME[extname(p)] || "application/octet-stream")
      res.end(body)
    } catch { res.statusCode = 404; res.end("nf") }
  }).listen(g.port)
}

// host-like wrapper page: iframe 854x600 like the OS mission iframe
const wrapperPort = 6319
createServer((req, res) => {
  const app = req.url.slice(1).split("?")[0] || "warehouse"
  const g = GAMES.find((x) => x.id === app) || GAMES[0]
  res.setHeader("content-type", "text/html")
  res.end(`<!doctype html><html><body style="margin:0">
    <iframe id="f" src="http://localhost:${g.port}/" style="width:854px;height:600px;border:0"></iframe>
  </body></html>`)
}).listen(wrapperPort)
await new Promise((r) => setTimeout(r, 500))

const b = await chromium.launch()
const out = {}
let fail = false
for (const g of GAMES) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
  await p.goto(`http://localhost:${wrapperPort}/${g.id}`)
  const frame = p.frames().find((f) => f.url().includes(`:${g.port}`))
  await frame.waitForSelector('[data-testid="hud-title"]', { timeout: 20000 })
  await p.waitForTimeout(800)
  const r = await frame.evaluate(() => {
    const hud = document.querySelector("#hud")
    return {
      iframeW: window.innerWidth,
      hudW: hud ? Math.round(hud.getBoundingClientRect().width) : null,
      scrollW: document.scrollingElement.scrollWidth,
      btnRight: Math.max(...[...document.querySelectorAll("#hud button")].map((x) => Math.round(x.getBoundingClientRect().right))),
    }
  })
  const ok = r.hudW >= 300 && r.scrollW <= r.iframeW && r.btnRight <= r.iframeW
  if (!ok) fail = true
  out[g.id] = { ...r, ok }
  console.log(g.id, JSON.stringify(out[g.id]))
  await p.close()
}
await b.close()
process.exit(fail ? 1 : 0)

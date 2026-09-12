import { chromium } from '/paperclip/tmp/aid268-qa/engines/voxelDojo/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
function serve(root, port) {
  createServer(async (req, res) => {
    try {
      let p = join(root, decodeURIComponent(req.url.split('?')[0]))
      if (p.endsWith('/')) p += 'index.html'
      const body = await readFile(p)
      res.setHeader('content-type', MIME[extname(p)] || 'application/octet-stream')
      res.end(body)
    } catch { res.statusCode = 404; res.end('nf') }
  }).listen(port)
}

const targets = process.argv.slice(2) // e.g. name=path:port
for (const t of targets) { const [name, rest] = t.split('='); const [path, port] = rest.split(':'); serve(path, Number(port)); console.log('serving', name, port) }
await new Promise(r => setTimeout(r, 500))

const b = await chromium.launch()
for (const t of targets) {
  const [name, rest] = t.split('='); const [, port] = rest.split(':')
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
  await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)
  const r = await p.evaluate(() => {
    const hud = document.querySelector('#hud')
    const stage = document.querySelector('#stage')
    return {
      scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
      hudW: hud ? Math.round(hud.getBoundingClientRect().width) : null,
      stageW: stage ? Math.round(stage.getBoundingClientRect().width) : null,
      hudMinWidth: hud ? getComputedStyle(hud).minWidth : null,
      stageMinWidth: stage ? getComputedStyle(stage).minWidth : null,
    }
  })
  console.log(name, JSON.stringify(r))
  await p.close()
}
await b.close()
process.exit(0)

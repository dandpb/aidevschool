// AID-403 QA independent identity check: alias == permalink == registry FINAL (byte-a-byte)
import { createHash } from 'node:crypto'

const PIN = '6d72735ba2113cb6198c4d7be26c2f01e5f5d694'
const MANIFEST_SHA = '7d0e16d9902e6a1f4b667db8bc8c8525f5cbdd33e3fd5d55e85a38c5fae836fe'
const ALIAS = 'https://aidevschool-codexdojo-os.netlify.app'
const PERMA = 'https://6a944cf24d75848dee3a5505--aidevschool-codexdojo-os.netlify.app'

const sha = (b) => createHash('sha256').update(b).digest('hex')
const results = []
const check = (id, ok, detail = '') => { results.push({ id, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail}`) }

const mAliasB = Buffer.from(await (await fetch(`${ALIAS}/pilot-bundle-manifest.json`)).arrayBuffer())
const mPermaB = Buffer.from(await (await fetch(`${PERMA}/pilot-bundle-manifest.json`)).arrayBuffer())
check('manifest-sha256-alias==registry', sha(mAliasB) === MANIFEST_SHA, sha(mAliasB))
check('manifest-sha256-permalink==registry', sha(mPermaB) === MANIFEST_SHA, sha(mPermaB))
check('manifest-alias==permalink-bytes', Buffer.compare(mAliasB, mPermaB) === 0, `${mAliasB.length}B`)
const manifest = JSON.parse(mAliasB.toString('utf8'))
check('manifest-sourceRevision==PIN', manifest.sourceRevision === PIN, manifest.sourceRevision)

// inventory (all listed files) fetched from both hosts, byte-compared + hashed against declared surface hashes
const declared = {}
for (const [name, s] of Object.entries(manifest.surfaces)) {
  declared[s.entry] = s.sha256
  for (const [p, meta] of Object.entries(s.requiredFiles ?? {})) declared[p] = meta.sha256
}
const paths = [...new Set([...manifest.files, ...Object.keys(declared)])]
let mism = 0, byteDiff = 0
for (const p of paths) {
  const [a, b] = await Promise.all([fetch(`${ALIAS}/${p}`), fetch(`${PERMA}/${p}`)])
  if (a.status !== 200 || b.status !== 200) { mism++; check(`fetch ${p}`, false, `${a.status}/${b.status}`); continue }
  const ab = Buffer.from(await a.arrayBuffer()), bb = Buffer.from(await b.arrayBuffer())
  if (Buffer.compare(ab, bb) !== 0) { byteDiff++; check(`byte-identical ${p}`, false, `${ab.length}B vs ${bb.length}B`) }
  if (declared[p] && sha(ab) !== declared[p]) { mism++; check(`declared-sha ${p}`, false, sha(ab)) }
}
check(`inventory byte-a-byte alias==permalink (${paths.length} files)`, byteDiff === 0, `${paths.length - byteDiff}/${paths.length}`)
check('declared sha256 all match', mism === 0, `${mismatchCountLabel(mism)}`)
function mismatchCountLabel(n) { return n === 0 ? 'all declared hashes match' : `${n} mismatches` }

// served OS bundle embeds the immutable pixelDojo pin (registry: VITE_PIXELDOJO_URL)
const osHtml = await (await fetch(`${ALIAS}/`)).text()
const osJsPath = osHtml.match(/assets\/index-[^"]*\.js/)?.[0]
const osJs = await (await fetch(`${ALIAS}/${osJsPath}`)).text()
check('os-embeds-pixeldojo-immutable-pin', osJs.includes('https://6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app/'), osJsPath)
// runtime env-resolution table: production VITE_* values (catalog/registry developmentUrl metadata is inert)
const envTable = osJs.match(/BASE_URL:`\/`,DEV:!1,MODE:`production`[^}]*\}/)?.[0] ?? ''
check('env-table-pixeldojo==pin', /VITE_PIXELDOJO_URL:`https:\/\/6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e\.netlify\.app\/`/.test(envTable), 'runtime resolution')
check('env-table-no-dev-localhost', !/VITE_\w+:`[^`]*127\.0\.0\.1/.test(envTable), 'no engine resolves to dev fallback in production')
check('os-embeds-same-origin-literacy', osJs.includes('/apps/literacydojo/'), '')

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} PASS`)
process.exit(failed.length ? 1 : 0)

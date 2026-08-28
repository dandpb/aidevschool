import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { deployPilotBundle } from './deploy-pilot-bundle.mjs'
import { createPilotBundleStage, createPilotManifest, PILOT_SURFACES, promotePilotBundle, verifyPilotBundle } from './pilot-bundle-lib.mjs'

test('keeps the invalid root service-worker probe ahead of the SPA fallback', async () => {
  const config = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8')
  const rootWorker = config.indexOf('from = "/sw.js"')
  const notFound = config.indexOf('status = 404', rootWorker)
  const spaFallback = config.indexOf('from = "/*"')

  assert.ok(rootWorker >= 0, 'missing explicit /sw.js route')
  assert.ok(notFound > rootWorker && notFound < spaFallback, '/sw.js must return 404 before the SPA fallback')
})

test('allows same-origin pilot apps to be framed without allowing external ancestors', async () => {
  const config = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8')
  const csp = config.match(/Content-Security-Policy = "([^"]+)"/)?.[1]

  assert.ok(csp, 'missing Content-Security-Policy header')
  assert.match(csp, /(?:^|; )frame-ancestors 'self'(?:;|$)/)
  assert.doesNotMatch(csp, /(?:^|; )frame-ancestors 'none'(?:;|$)/)
})

test('builds the pilot OS with the same-origin literacydojo app pinned by revision', async () => {
  const script = await readFile(new URL('./build-pilot-bundle.mjs', import.meta.url), 'utf8')

  // AID-282: the literacy motor must ship inside the OS bundle so its
  // contentVersion cannot drift from the mission catalog of the same revision.
  assert.match(script, /const publicLiteracyDojoUrl = '\/apps\/literacydojo\/'/)
  assert.doesNotMatch(script, /--aidevschool-literacydojo\.netlify\.app/)
  assert.match(script, /VITE_LITERACYDOJO_URL: publicLiteracyDojoUrl/)
})

test('builds the Dev journey against an immutable PixelDojo origin', async () => {
  const script = await readFile(new URL('./build-pilot-bundle.mjs', import.meta.url), 'utf8')

  assert.match(script, /https:\/\/[a-f0-9]+--[a-z0-9-]+\.netlify\.app\//)
  assert.match(script, /VITE_PIXELDOJO_URL: publicPixelDojoUrl/)
})

test('keeps launchable Dev missions inside the immutable OS bundle', async () => {
  const script = await readFile(new URL('./build-pilot-bundle.mjs', import.meta.url), 'utf8')

  assert.match(script, /VITE_WAREHOUSE_URL: '\/apps\/warehouse\/'/)
  assert.match(script, /VITE_WORMHOLE_URL: '\/apps\/wormhole\/'/)
  assert.match(script, /VITE_RELAY_STATION_URL: '\/apps\/relay-station\/'/)
})

test('builds bundled Dev missions with their deployed subpath as the Vite base', async () => {
  const script = await readFile(new URL('./build-pilot-bundle.mjs', import.meta.url), 'utf8')

  assert.match(script, /args: \['run', 'build', '--base=\/apps\/warehouse\/'\]/)
  assert.match(script, /args: \['run', 'build', '--base=\/apps\/wormhole\/'\]/)
  assert.match(script, /args: \['run', 'build', '--base=\/apps\/relay-station\/'\]/)
})

test('the public LiteracyDojo build cannot omit its independent verifier endpoint', async () => {
  const config = await readFile(new URL('../../literacyDojo/netlify.toml', import.meta.url), 'utf8')

  assert.match(config, /VITE_LITERACY_VERIFIER_URL = "\/.netlify\/functions\/literacy-verify"/)
  assert.match(config, /functions = "\.\.\/\.\.\/learner\/gate\/netlify-functions"/)
})

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'pilot-bundle-test-'))
  for (const surface of PILOT_SURFACES) {
    for (const file of [surface.entry, ...(surface.requiredFiles ?? [])]) {
      const path = join(root, file)
      await mkdir(join(path, '..'), { recursive: true })
      await writeFile(path, `<html>${surface.name}</html>`)
    }
  }
  const manifest = await createPilotManifest(root, 'test-sha')
  await writeFile(join(root, 'pilot-bundle-manifest.json'), JSON.stringify(manifest))
  return root
}

test('creates the promotion stage on the output filesystem', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pilot-promotion-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const stage = await createPilotBundleStage(join(root, 'dist'))

  assert.equal(dirname(stage), root)
  assert.equal((await stat(stage)).dev, (await stat(root)).dev)
})

test('restores the previous bundle when stage promotion fails', async () => {
  const calls = []
  const promotionError = Object.assign(new Error('promotion failed'), { code: 'EIO' })
  const operations = {
    rm: async () => {},
    rename: async (from, to) => {
      calls.push([from, to])
      if (from === 'stage') throw promotionError
    },
  }

  await assert.rejects(promotePilotBundle('stage', 'dist', 'backup', operations), promotionError)
  assert.deepEqual(calls, [['dist', 'backup'], ['stage', 'dist'], ['backup', 'dist']])
})

test('reports both promotion and rollback failures', async () => {
  const operations = {
    rm: async () => {},
    rename: async (from) => {
      if (from === 'dist') return
      throw new Error(from === 'stage' ? 'promotion failed' : 'rollback failed')
    },
  }

  await assert.rejects(
    promotePilotBundle('stage', 'dist', 'backup', operations),
    (error) => error instanceof AggregateError && error.errors.map(({ message }) => message).join() === 'promotion failed,rollback failed',
  )
})

test('accepts a complete bundle whose inventory and entry hashes match', async (t) => {
  const root = await fixture()
  t.after(() => rm(root, { recursive: true, force: true }))
  const manifest = await verifyPilotBundle(root)
  assert.equal(manifest.sourceRevision, 'test-sha')
  assert.match(
    manifest.surfaces.literacydojo.requiredFiles['apps/literacydojo/termos.html'].sha256,
    /^[a-f0-9]{64}$/,
  )
  assert.match(
    manifest.surfaces.literacydojo.requiredFiles['apps/literacydojo/privacidade.html'].sha256,
    /^[a-f0-9]{64}$/,
  )
})

test('rejects a missing surface instead of allowing a partial deploy', async (t) => {
  const root = await fixture()
  t.after(() => rm(root, { recursive: true, force: true }))
  await rm(join(root, 'apps/wormhole/index.html'))
  await assert.rejects(verifyPilotBundle(root), /missing apps\/wormhole\/index.html/)
})

test('rejects a LiteracyDojo bundle missing a public legal document', async (t) => {
  const root = await fixture()
  t.after(() => rm(root, { recursive: true, force: true }))
  await rm(join(root, 'apps/literacydojo/privacidade.html'))
  await assert.rejects(
    createPilotManifest(root, 'test-sha'),
    /missing apps\/literacydojo\/privacidade.html/,
  )
})

test('rejects a pilot bundle missing the scoped LiteracyDojo service worker', async (t) => {
  const root = await fixture()
  t.after(() => rm(root, { recursive: true, force: true }))
  await rm(join(root, 'apps/literacydojo/sw.js'))
  await assert.rejects(
    createPilotManifest(root, 'test-sha'),
    /missing apps\/literacydojo\/sw\.js/,
  )
})

test('rejects files changed after the manifest was issued', async (t) => {
  const root = await fixture()
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'apps/warehouse/index.html'), '<html>tampered</html>')
  await assert.rejects(verifyPilotBundle(root), /warehouse entry does not match manifest/)
})

test('rejects a legal document changed after the manifest was issued', async (t) => {
  const root = await fixture()
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'apps/literacydojo/privacidade.html'), '<html>tampered legal text</html>')
  await assert.rejects(
    verifyPilotBundle(root),
    /apps\/literacydojo\/privacidade\.html does not match manifest/,
  )
})

test('a partial bundle fails before the deploy process can be spawned', async (t) => {
  const root = await fixture()
  t.after(() => rm(root, { recursive: true, force: true }))
  await rm(join(root, 'apps/relay-station/index.html'))
  let publishAttempted = false
  const fakeSpawn = () => {
    publishAttempted = true
    return { status: 0 }
  }
  await assert.rejects(deployPilotBundle(root, ['--prod'], fakeSpawn), /bundle incomplete/)
  assert.equal(publishAttempted, false)
})

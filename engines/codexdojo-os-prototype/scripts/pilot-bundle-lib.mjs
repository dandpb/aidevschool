import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, rename, rm, stat } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'

export async function createPilotBundleStage(output) {
  return mkdtemp(join(dirname(output), '.aidevschool-pilot-bundle-'))
}

export async function promotePilotBundle(stage, output, backup, operations = { rename, rm }) {
  await operations.rm(backup, { recursive: true, force: true })
  await operations.rename(output, backup).catch((error) => { if (error.code !== 'ENOENT') throw error })
  try {
    await operations.rename(stage, output)
  } catch (promotionError) {
    try {
      await operations.rename(backup, output)
    } catch (rollbackError) {
      throw new AggregateError([promotionError, rollbackError], 'pilot bundle promotion and rollback failed')
    }
    throw promotionError
  }
  await operations.rm(backup, { recursive: true, force: true })
}

export const PILOT_SURFACES = [
  { name: 'os', entry: 'index.html' },
  {
    name: 'literacydojo',
    entry: 'apps/literacydojo/index.html',
    requiredFiles: [
      'apps/literacydojo/sw.js',
      'apps/literacydojo/termos.html',
      'apps/literacydojo/privacidade.html',
    ],
  },
  { name: 'warehouse', entry: 'apps/warehouse/index.html' },
  { name: 'wormhole', entry: 'apps/wormhole/index.html' },
  { name: 'relay-station', entry: 'apps/relay-station/index.html' },
  { name: 'pipeline-plant', entry: 'apps/pipeline-plant/index.html' },
  { name: 'checkpoint-city', entry: 'apps/checkpoint-city/index.html' },
  { name: 'timeline-tower', entry: 'apps/timeline-tower/index.html' },
]

async function filesBelow(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(current, entry.name)
    if (entry.isDirectory()) files.push(...await filesBelow(root, path))
    else if (entry.isFile()) files.push(relative(root, path).split(sep).join('/'))
  }
  return files
}

async function sha256(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex')
}

export async function createPilotManifest(root, sourceRevision) {
  const surfaces = {}
  for (const surface of PILOT_SURFACES) {
    const requiredFiles = [surface.entry, ...(surface.requiredFiles ?? [])]
    for (const requiredFile of requiredFiles) {
      if (!(await stat(join(root, requiredFile)).catch(() => undefined))?.isFile()) {
        throw new Error(`pilot bundle incomplete: missing ${requiredFile}`)
      }
    }
    const entryPath = join(root, surface.entry)
    const requiredFileHashes = {}
    for (const requiredFile of surface.requiredFiles ?? []) {
      requiredFileHashes[requiredFile] = { sha256: await sha256(join(root, requiredFile)) }
    }
    surfaces[surface.name] = {
      entry: surface.entry,
      sha256: await sha256(entryPath),
      ...(Object.keys(requiredFileHashes).length > 0 ? { requiredFiles: requiredFileHashes } : {}),
    }
  }
  return {
    schemaVersion: 1,
    sourceRevision,
    surfaces,
    files: (await filesBelow(root)).sort(),
  }
}

export async function verifyPilotBundle(root) {
  const manifestPath = join(root, 'pilot-bundle-manifest.json')
  let manifest
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch (error) {
    throw new Error(`pilot bundle is not deployable: invalid or missing ${manifestPath}`, { cause: error })
  }
  const expected = await createPilotManifest(root, manifest.sourceRevision)
  for (const surface of PILOT_SURFACES) {
    const actual = manifest.surfaces?.[surface.name]
    if (actual?.entry !== expected.surfaces[surface.name].entry
      || actual?.sha256 !== expected.surfaces[surface.name].sha256) {
      throw new Error(`pilot bundle is not deployable: ${surface.name} entry does not match manifest`)
    }
    for (const requiredFile of surface.requiredFiles ?? []) {
      if (actual.requiredFiles?.[requiredFile]?.sha256
        !== expected.surfaces[surface.name].requiredFiles[requiredFile].sha256) {
        throw new Error(`pilot bundle is not deployable: ${requiredFile} does not match manifest`)
      }
    }
  }
  const actualFiles = [...(manifest.files ?? [])].sort()
  const expectedFiles = expected.files.filter((file) => file !== 'pilot-bundle-manifest.json')
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error('pilot bundle is not deployable: file inventory does not match manifest')
  }
  return manifest
}

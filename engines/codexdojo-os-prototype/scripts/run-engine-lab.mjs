import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const osRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const enginesRoot = resolve(osRoot, '..')

const runtimes = [
  { name: 'codexDojo OS', cwd: osRoot, command: 'npm', args: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4174', '--strictPort'] },
  { name: 'codexDojo', cwd: resolve(enginesRoot, 'codexDojo'), command: 'pnpm', args: ['exec', 'vite', '--host', '127.0.0.1', '--port', '5175', '--strictPort'] },
  { name: 'PixelDojo', cwd: resolve(enginesRoot, 'pixelDojo', 'pixel-quest'), command: 'pnpm', args: ['exec', 'vite', '--host', '127.0.0.1', '--port', '5176', '--strictPort'] },
  { name: 'LiteracyDojo', cwd: resolve(enginesRoot, 'literacyDojo'), command: 'npm', args: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5178', '--strictPort'] },
  { name: 'miniTown', cwd: resolve(enginesRoot, 'miniTown'), command: 'pnpm', args: ['exec', 'vite', '--host', '127.0.0.1', '--port', '5179', '--strictPort'] },
  { name: 'dojoToday', cwd: resolve(enginesRoot, 'dojoToday'), command: 'npm', args: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5180', '--strictPort'] },
  { name: 'voxelDojo catalog', cwd: resolve(enginesRoot, 'voxelDojo'), command: 'pnpm', args: ['run', 'dev:catalog'] },
]

const children = new Set()
let stopping = false

if (process.argv.includes('--list')) {
  for (const runtime of runtimes) {
    console.log(`${runtime.name}\n  cwd: ${runtime.cwd}\n  command: ${runtime.command} ${runtime.args.join(' ')}`)
  }
  process.exit(0)
}

function stop(exitCode = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (process.platform !== 'win32' && child.pid !== undefined) {
      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch (error) {
        if (error.code !== 'ESRCH') throw error
      }
    } else {
      child.kill('SIGTERM')
    }
  }
  setTimeout(() => process.exit(exitCode), 500).unref()
}

console.log('AiDevSchool Engine Lab')
console.log('Hub: http://127.0.0.1:4174/desktop')
console.log('Abra Atividades, procure “Engine Hub” e selecione uma engine.\n')

for (const runtime of runtimes) {
  const child = spawn(runtime.command, runtime.args, {
    cwd: runtime.cwd,
    env: { ...process.env, VITE_LOCAL_ENGINE_BRIDGE: 'true' },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  children.add(child)
  child.stdout.on('data', (chunk) => process.stdout.write(`[${runtime.name}] ${chunk}`))
  child.stderr.on('data', (chunk) => process.stderr.write(`[${runtime.name}] ${chunk}`))
  child.on('error', (error) => {
    console.error(`[${runtime.name}] não iniciou: ${error.message}`)
    stop(1)
  })
  child.on('exit', (code, signal) => {
    children.delete(child)
    if (!stopping) {
      console.error(`[${runtime.name}] encerrou inesperadamente (${signal ?? code ?? 'unknown'}).`)
      stop(code ?? 1)
    }
  })
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))

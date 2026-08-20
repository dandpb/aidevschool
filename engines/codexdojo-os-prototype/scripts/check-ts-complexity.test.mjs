import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const CHECKER = fileURLToPath(new URL('./check-ts-complexity.mjs', import.meta.url))

function runFixture(source) {
  const directory = mkdtempSync(join(tmpdir(), 'ts-complexity-'))
  const fixture = join(directory, 'fixture.ts')
  writeFileSync(fixture, source)
  const result = spawnSync(process.execPath, [CHECKER, fixture, '--max', '8'], {
    encoding: 'utf8',
  })
  rmSync(directory, { recursive: true, force: true })
  return result
}

test('accepts a function bounded by the configured maximum', () => {
  const result = runFixture(`
    function bounded(value: boolean): boolean {
      if (value) return true
      return false
    }
  `)

  assert.equal(result.status, 0)
  assert.match(result.stdout, /functions=1 maxCC=2 limit=8/)
  assert.equal(result.stderr, '')
})

test('rejects ordinary and assignment logical operators above the maximum', () => {
  const result = runFixture(`
    function logicalCc9(a: boolean, b: boolean, c: boolean, d: boolean,
      e: boolean, f: boolean, g: boolean, h: boolean, i: boolean): boolean {
      let value = a && b
      value ||= c
      value &&= d
      value ??= e
      return (value || f || g) ?? (h && i)
    }
  `)
  const output = `${result.stderr}${result.stdout}`

  assert.equal(result.status, 1)
  assert.match(output, /fixture\.ts:logicalCc9:2: complexity 9 exceeds 8/)
  assert.match(result.stdout, /functions=1 maxCC=9 limit=8/)
})

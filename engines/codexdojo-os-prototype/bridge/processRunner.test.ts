import { describe, expect, it } from 'vitest'
import type { AllowedAction } from './actions'
import { runProcess } from './processRunner'

function nodeAction(args: readonly string[], timeoutMs: number): AllowedAction {
  return {
    engineId: 'minimaxDojo',
    action: 'prepare-tutor-session',
    executable: process.execPath,
    args,
    cwd: '.',
    timeoutMs,
  }
}

describe('engine bridge process runner', () => {
  it('captures stdout and the real exit code without a shell', async () => {
    // Given
    const action = nodeAction(['-e', 'process.stdout.write("bridge-ready")'], 2_000)

    // When
    const receipt = await runProcess(action)

    // Then
    expect(receipt).toEqual({ exitCode: 0, stdout: 'bridge-ready', stderr: '' })
  })

  it('kills a child that exceeds its fixed action timeout', async () => {
    // Given
    const action = nodeAction(['-e', 'setInterval(() => {}, 1000)'], 50)

    // When
    const execution = runProcess(action)

    // Then
    await expect(execution).rejects.toThrow('timed out')
  })
})

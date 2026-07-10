import { describe, expect, it, vi } from 'vitest'
import { allowedActions, executeAllowedAction, resolveAllowedAction } from './actions'

describe('engine bridge allowlist', () => {
  it('pins every local action to a fixed executable, argv, cwd, and timeout', () => {
    // Given
    const actions = allowedActions

    // When
    const publicContract = actions.map(({ engineId, action, executable, args, cwd, timeoutMs }) => ({
      engineId,
      action,
      executable,
      args,
      cwd,
      timeoutMs,
    }))

    // Then
    expect(publicContract).toEqual([
      {
        engineId: 'minimaxDojo',
        action: 'prepare-tutor-session',
        executable: 'python3',
        args: ['-m', 'engines.minimaxDojo.os_adapter'],
        cwd: '../..',
        timeoutMs: 10_000,
      },
      {
        engineId: 'miniMaxEvolutionEngine',
        action: 'prepare-workflow',
        executable: 'python3',
        args: ['-m', 'engines.miniMaxEvolutionEngine.os_adapter'],
        cwd: '../..',
        timeoutMs: 10_000,
      },
      {
        engineId: 'openclaw',
        action: 'preview-checklist',
        executable: 'python3',
        args: ['-m', 'engines.openclaw', '--preview'],
        cwd: '../..',
        timeoutMs: 10_000,
      },
    ])
  })

  it('rejects every engine/action pair outside the allowlist', () => {
    // Given
    const unsafePairs = [
      ['openclaw', 'run'],
      ['openclaw', '--phase spec'],
      ['pixelDojo', 'spawn'],
      ['../../etc', 'read'],
    ] as const

    // When
    const resolved = unsafePairs.map(([engineId, action]) => resolveAllowedAction(engineId, action))

    // Then
    expect(resolved).toEqual([undefined, undefined, undefined, undefined])
  })

  it('passes only the pinned action spec to the process executor', async () => {
    // Given
    const executor = vi.fn().mockResolvedValue({ exitCode: 0, stdout: '1 passed', stderr: '' })

    // When
    const receipt = await executeAllowedAction('minimaxDojo', 'prepare-tutor-session', executor)

    // Then
    expect(receipt).toEqual({ exitCode: 0, stdout: '1 passed', stderr: '' })
    expect(executor).toHaveBeenCalledOnce()
    expect(executor.mock.calls[0]?.[0]).toEqual(allowedActions[0])
  })
})

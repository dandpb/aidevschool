import { describe, expect, it, vi } from 'vitest'
import { createEngineActionClient } from './client'

describe('Engine Hub bridge client', () => {
  it('returns a parsed action receipt from the same-origin bridge', async () => {
    // Given
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      summary: 'Ação concluída',
      output: '8 passed',
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    const runAction = createEngineActionClient(fetcher, () => 'session-token')

    // When
    const result = await runAction('openclaw', 'preview-checklist')

    // Then
    expect(fetcher).toHaveBeenCalledWith(
      '/__dojo/bridge/v1/engines/openclaw/actions/preview-checklist',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-codexdojo-bridge-token': 'session-token',
        },
        body: '{}',
      },
    )
    expect(result).toEqual({ ok: true, summary: 'Ação concluída', output: '8 passed' })
  })

  it('rejects a malformed bridge response instead of trusting unknown JSON', async () => {
    // Given
    const fetcher = vi.fn().mockResolvedValue(new Response('{"ok":"yes"}', { status: 200 }))
    const runAction = createEngineActionClient(fetcher, () => 'session-token')

    // When
    const action = runAction('minimaxDojo', 'run-reference-contract')

    // Then
    await expect(action).rejects.toThrow('invalid response')
  })

  it('preserves an offline network failure for the Hub error state', async () => {
    // Given
    const fetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const runAction = createEngineActionClient(fetcher, () => 'session-token')

    // When
    const action = runAction('openclaw', 'preview-checklist')

    // Then
    await expect(action).rejects.toThrow('Failed to fetch')
  })

  it('fails closed when the served document has no bridge session token', async () => {
    const fetcher = vi.fn()
    const runAction = createEngineActionClient(fetcher, () => null)

    await expect(runAction('openclaw', 'preview-checklist')).rejects.toThrow('session token')
    expect(fetcher).not.toHaveBeenCalled()
  })
})

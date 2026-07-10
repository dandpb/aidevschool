import { describe, expect, it, vi } from 'vitest'
import { routeBridgeRequest } from './router'

describe('engine bridge router', () => {
  it('executes one exact allowlisted POST action', async () => {
    // Given
    const executor = vi.fn().mockResolvedValue({ exitCode: 0, stdout: '12 passed', stderr: '' })

    // When
    const response = await routeBridgeRequest({
      method: 'POST',
      pathname: '/__dojo/bridge/v1/engines/miniMaxEvolutionEngine/actions/validate-phase-runner',
      body: '{}',
    }, executor)

    // Then
    expect(response).toEqual({
      status: 200,
      body: { ok: true, summary: 'Ação concluída', output: '12 passed' },
    })
    expect(executor).toHaveBeenCalledOnce()
  })

  it.each([
    ['GET', '/__dojo/bridge/v1/engines/openclaw/actions/preview-checklist', '{}', 405],
    ['POST', '/__dojo/bridge/v1/engines/openclaw/actions/run', '{}', 404],
    ['POST', '/__dojo/bridge/v1/engines/../../etc/actions/read', '{}', 404],
    ['POST', '/__dojo/bridge/v1/engines/openclaw/actions/preview-checklist', '{bad', 400],
  ])('rejects %s %s without invoking a process', async (method, pathname, body, status) => {
    // Given
    const executor = vi.fn()

    // When
    const response = await routeBridgeRequest({ method, pathname, body }, executor)

    // Then
    expect(response.status).toBe(status)
    expect(executor).not.toHaveBeenCalled()
  })
})


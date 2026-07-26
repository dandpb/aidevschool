import { describe, expect, it, vi } from 'vitest'
import { routeBridgeRequest } from './router'

describe('engine bridge action router', () => {
  it('executes one exact allowlisted POST action', async () => {
    const executor = vi.fn().mockResolvedValue({ exitCode: 0, stdout: '12 passed', stderr: '' })

    const response = await routeBridgeRequest({
      method: 'POST',
      pathname: '/__dojo/bridge/v1/engines/miniMaxEvolutionEngine/actions/prepare-workflow',
      body: '{}',
    }, executor)

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
    const executor = vi.fn()

    const response = await routeBridgeRequest({ method, pathname, body }, executor)

    expect(response.status).toBe(status)
    expect(executor).not.toHaveBeenCalled()
  })
})

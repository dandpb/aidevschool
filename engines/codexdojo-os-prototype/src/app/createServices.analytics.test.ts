import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServices } from './createServices'

// AID-470 emission boundary: nothing leaves the browser unless
// VITE_ANALYTICS_ENDPOINT is explicitly configured at build time. This test is
// the executable evidence that the default (and the empty-string alias
// configuration) keeps analytics on the in-memory sink with zero network calls.

describe('createServices analytics transport selection', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    window.__codexdojoAnalytics = undefined
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    window.__codexdojoAnalytics = undefined
  })

  it('keeps analytics in-memory (zero network) without VITE_ANALYTICS_ENDPOINT', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { analytics } = createServices()

    expect(analytics.emit({ name: 'onboarding.started' })).toBe(true)
    // mission.completed flushes immediately through the batcher.
    expect(analytics.emit({ name: 'mission.completed', dimensions: { result: 'completed' } })).toBe(true)

    await vi.waitFor(() => {
      expect(window.__codexdojoAnalytics?.events.map((event) => event.name)).toEqual([
        'onboarding.started',
        'mission.completed',
      ])
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps analytics in-memory when the endpoint is configured as an empty string', async () => {
    vi.stubEnv('VITE_ANALYTICS_ENDPOINT', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { analytics } = createServices()

    expect(analytics.emit({ name: 'onboarding.started' })).toBe(true)
    expect(analytics.emit({ name: 'mission.completed', dimensions: { result: 'completed' } })).toBe(true)

    await vi.waitFor(() => {
      expect(window.__codexdojoAnalytics?.events.length).toBe(2)
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('selects the same-origin transport only when the endpoint is explicitly set', async () => {
    vi.stubEnv('VITE_ANALYTICS_ENDPOINT', '/__dojo/bridge/v1/analytics')
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(
      JSON.stringify({ acceptedEventIds: [] }),
      { status: 202, headers: { 'content-type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)

    const { analytics } = createServices()

    expect(analytics.emit({ name: 'onboarding.started' })).toBe(true)
    // mission.completed flushes synchronously through the batcher.
    expect(analytics.emit({ name: 'mission.completed', dimensions: { result: 'completed' } })).toBe(true)

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
    const call = fetchMock.mock.calls[0]
    expect(call?.[0]).toBe('/__dojo/bridge/v1/analytics')
    expect((call?.[1] as RequestInit | undefined)?.method).toBe('POST')
  })
})

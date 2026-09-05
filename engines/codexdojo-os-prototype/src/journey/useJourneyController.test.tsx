import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { ServicesProvider } from '../app/ServicesProvider'
import { createServices } from '../app/createServices'
import type { NavigationPort, OsPath } from '../app/routes'
import { missionCatalog } from '../data/missions'
import { completeOnboarding, createInitialOsProgress, type OsProgress } from '../progress/domain'
import { useJourneyController } from './useJourneyController'

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

function navigationAt(initialPath: string): NavigationPort {
  let path = initialPath
  const listeners = new Set<(nextPath: string) => void>()
  const update = (nextPath: OsPath) => {
    path = nextPath
    for (const listener of listeners) listener(path)
  }
  return {
    currentPath: () => path,
    push: update,
    replace: update,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

describe('useJourneyController track query', () => {
  it('applies ?track=dev even when onboarding is already completed', async () => {
    window.history.replaceState(null, '', '/?track=dev')
    const onboarded = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })
    let saved: OsProgress | null = onboarded
    const services = createServices({
      navigation: navigationAt('/'),
      progress: {
        load: async () => saved,
        save: async (progress) => {
          saved = progress
        },
        reset: async () => {
          saved = null
        },
      },
    })
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <ServicesProvider services={services}>{children}</ServicesProvider>
    )

    const { result } = renderHook(() => useJourneyController(), { wrapper })

    await waitFor(() => {
      expect(result.current.state.kind).toBe('ready')
    })
    if (result.current.state.kind !== 'ready') throw new Error('expected ready')
    expect(result.current.requestedTrackId).toBe('dev')
    expect(result.current.state.progress.onboarding.selectedTrackId).toBe('dev')
    expect(result.current.state.progress.activeTrackId).toBe('dev')
    expect(result.current.state.route.kind).toBe('hub')
  })
})

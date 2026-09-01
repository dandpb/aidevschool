import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ServicesProvider } from '../app/ServicesProvider'
import { createServices } from '../app/createServices'
import type { NavigationPort, OsPath } from '../app/routes'
import { anonymousPublicLearner } from '../data/anonymousLearner'
import { missionCatalog } from '../data/missions'
import { completeOnboarding, createInitialOsProgress, type OsProgress } from '../progress/domain'
import { JourneyApp } from './JourneyApp'

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

describe('public JourneyApp learner default', () => {
  it('does not ship the author yaml snapshot as the public learner', async () => {
    const onboarded = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })
    let saved: OsProgress | null = onboarded
    const services = createServices({
      navigation: navigationAt('/hub'),
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

    render(
      <ServicesProvider services={services}>
        <JourneyApp />
      </ServicesProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('canonical-mastery-count').textContent).toBe(
        '0 competências verificadas',
      )
    })
    expect(anonymousPublicLearner.masteredCount).toBe(0)
    expect(anonymousPublicLearner.activeUnit.state).not.toBe('mastered')
  })
})

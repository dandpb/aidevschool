import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createServices } from '../app/createServices'
import { ServicesProvider } from '../app/ServicesProvider'
import { learnerSnapshot } from '../data/learner'
import { missionCatalog } from '../data/missions'
import { GeneratedMissionCatalogRepository } from '../missions/catalog'
import {
  completeOnboarding,
  createInitialOsProgress,
  recordMissionCompletion,
} from '../progress/domain'
import type { VerificationService } from '../verification/ports'
import { Hub } from './Hub'

const verification: VerificationService = {
  async accept() {
    return { kind: 'not-submitted' }
  },
  async retry() {
    return { kind: 'not-submitted' }
  },
  async latest() {
    return { kind: 'not-submitted' }
  },
}

describe('mission-first hub progression', () => {
  it('shows one next action, local rewards, and non-shaming return language', async () => {
    const l02 = missionCatalog.missions.find((mission) => mission.id === 'l02')
    if (l02 === undefined) throw new Error('Expected l02')
    const onboarded = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })
    const progress = recordMissionCompletion(onboarded, l02, missionCatalog, 'l03', {
      now: new Date('2026-07-20T10:00:00-03:00'),
    })
    const onOpenProgress = vi.fn()
    const services = createServices({
      verification,
      clock: () => new Date('2026-07-25T10:00:00-03:00'),
    })

    render(
      <ServicesProvider services={services}>
        <Hub
          progress={progress}
          learner={{ ...learnerSnapshot, nextReviews: [], topPitfalls: [] }}
          catalog={new GeneratedMissionCatalogRepository()}
          onLaunch={vi.fn()}
          onOpenMap={vi.fn()}
          onOpenProgress={onOpenProgress}
          onSwitchTrack={vi.fn()}
        />
      </ServicesProvider>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'O que a IA faz bem e onde costuma falhar' }),
      ).not.toBeNull()
    })
    expect(screen.getByText('25', { selector: '.hub-chips strong' })).not.toBeNull()
    expect(screen.getByText(/Uma pausa não remove XP/)).not.toBeNull()
    expect(screen.queryByText(/\bvidas?\b|\benergia\b/i)).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Entender meu progresso' }))
    expect(onOpenProgress).toHaveBeenCalledOnce()
  })
})

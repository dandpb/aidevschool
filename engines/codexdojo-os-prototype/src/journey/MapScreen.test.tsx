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
import { MapScreen } from './MapScreen'
import { TrackSwitcher } from './TrackSwitcher'

function verificationService(): VerificationService {
  return {
    async accept() {
      return { kind: 'not-submitted' }
    },
    async retry() {
      return { kind: 'not-submitted' }
    },
    async latest(mission) {
      return mission.id === 'l02'
        ? {
            kind: 'verified',
            evidenceDigest: 'a'.repeat(64),
            receipt: {
              verdict: 'PASS',
              context_isolated: true,
              source: 'independent-literacy-verifier',
              evidence_digest: 'a'.repeat(64),
              lesson_id: 'l02',
              activity_id: 'l02-a1',
              attempt_id: 'attempt-1',
              activity_type: 'output_comparison',
              score: 1,
              producer_pass_claim: true,
              independent_pass: true,
              mastery_eligible: true,
              errors: [],
              producer_writes_mastered: false,
              max_producer_claim: 'completed',
            },
          }
        : { kind: 'not-submitted' }
    },
  }
}

describe('chapter map and track switching', () => {
  it('shows both ordered chapters with lock, completion, verification, and mastery overlays', async () => {
    const l02 = missionCatalog.missions.find((mission) => mission.id === 'l02')
    if (l02 === undefined) throw new Error('Expected l02')
    let progress = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })
    progress = recordMissionCompletion(progress, l02, missionCatalog, 'l03')
    const services = createServices({ verification: verificationService() })

    render(
      <ServicesProvider services={services}>
        <MapScreen
          progress={progress}
          learner={{
            ...learnerSnapshot,
            activeUnit: { ...learnerSnapshot.activeUnit, id: 'ai-literacy:l03', state: 'mastered' },
          }}
          catalog={new GeneratedMissionCatalogRepository()}
          onLaunch={vi.fn()}
          onSwitchTrack={vi.fn()}
          onBack={vi.fn()}
        />
      </ServicesProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Duas trilhas, seis missões' })).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Sistemas que você pode manipular' })).not.toBeNull()
    expect(screen.getAllByText('Bloqueada por pré-requisito').length).toBeGreaterThan(0)
    await waitFor(() =>
      expect(screen.getByText('Verificação independente concluída')).not.toBeNull(),
    )
    expect(screen.getByText('Competência canônica verificada')).not.toBeNull()
  })

  it('changes only the active recommendation control', async () => {
    const onSwitch = vi.fn()
    render(<TrackSwitcher activeTrackId="ai-pratica" onSwitch={onSwitch} />)

    await userEvent.click(screen.getByRole('button', { name: /Trilha Dev/ }))

    expect(onSwitch).toHaveBeenCalledWith('dev')
    expect(screen.getByRole('button', { name: /IA Prática/ }).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })
})

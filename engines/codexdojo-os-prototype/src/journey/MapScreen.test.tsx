import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ServicesProvider } from '../app/ServicesProvider'
import { createServices } from '../app/createServices'
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

function verificationService(): VerificationService {
  return {
    async accept() { return { kind: 'not-submitted' } },
    async retry() { return { kind: 'not-submitted' } },
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

describe('chapter map', () => {
  it('shows the student mission sequence without Trilha Dev or track switching', async () => {
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
          onBack={vi.fn()}
        />
      </ServicesProvider>,
    )

    expect(screen.getByRole('heading', { name: '22 missões, uma sequência' })).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'WAREHOUSE: Key-Value Store (in-memory)', level: 3 })).not.toBeNull()
    expect(screen.queryByText(/Trilha Dev/)).toBeNull()
    expect(screen.queryByRole('button', { name: /Trilha Dev/ })).toBeNull()
    expect(screen.getAllByText('Bloqueada por pré-requisito').length).toBeGreaterThan(0)
    await waitFor(() => expect(screen.getByText('Verificação independente concluída')).not.toBeNull())
    expect(screen.getByText('Competência canônica verificada')).not.toBeNull()
  })
})

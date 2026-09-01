import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ServicesProvider } from '../app/ServicesProvider'
import { createServices } from '../app/createServices'
import { learnerSnapshot } from '../data/learner'
import { missionCatalog } from '../data/missions'
import { GeneratedMissionCatalogRepository } from '../missions/catalog'
import { createInitialOsProgress, recordMissionCompletion } from '../progress/domain'
import type { VerificationService } from '../verification/ports'
import { ProgressScreen } from './ProgressScreen'

const verification: VerificationService = {
  async accept() { return { kind: 'not-submitted' } },
  async retry() { return { kind: 'not-submitted' } },
  async latest() { return { kind: 'not-submitted' } },
}

describe('honest progress screen', () => {
  it('labels local, producer, verifier, and canonical sources separately', async () => {
    const l02 = missionCatalog.missions.find((mission) => mission.id === 'l02')
    if (l02 === undefined) throw new Error('Expected l02')
    const now = new Date('2026-07-25T10:00:00-03:00')
    const progress = recordMissionCompletion(
      createInitialOsProgress(missionCatalog),
      l02,
      missionCatalog,
      undefined,
      { now },
    )
    const services = createServices({ verification, clock: () => now })

    render(
      <ServicesProvider services={services}>
        <ProgressScreen
          progress={progress}
          learner={learnerSnapshot}
          catalog={new GeneratedMissionCatalogRepository()}
          onBack={vi.fn()}
        />
      </ServicesProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Esforço local não substitui competência verificada.' })).not.toBeNull()
    expect(screen.getByText('Fonte: OS / IndexedDB')).not.toBeNull()
    expect(screen.getByText('Fonte: learner/substrate')).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Evidência preservada' })).not.toBeNull()
    await waitFor(() => expect(screen.getAllByText('Sem evidência recebida')).toHaveLength(27))
    expect(screen.getAllByText('Realizada').length).toBeGreaterThan(0)
  })

  it('keeps local progress visible when verification loading is unavailable', async () => {
    const now = new Date('2026-07-25T10:00:00-03:00')
    const services = createServices({
      verification: { ...verification, async latest() { throw new Error('verification repository unavailable') } },
      clock: () => now,
    })

    render(
      <ServicesProvider services={services}>
        <ProgressScreen
          progress={createInitialOsProgress(missionCatalog)}
          learner={learnerSnapshot}
          catalog={new GeneratedMissionCatalogRepository()}
          onBack={vi.fn()}
        />
      </ServicesProvider>,
    )

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Verificação indisponível no momento'))
    expect(screen.getAllByText('Sem evidência recebida')).toHaveLength(27)
    expect(screen.getByText('Fonte: OS / IndexedDB')).not.toBeNull()
  })
})

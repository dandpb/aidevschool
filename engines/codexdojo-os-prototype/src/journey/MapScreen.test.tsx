import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ServicesProvider } from '../app/ServicesProvider'
import { createServices } from '../app/createServices'
import { anonymousPublicLearner } from '../data/anonymousLearner'
import { missionCatalog } from '../data/missions'
import { GeneratedMissionCatalogRepository } from '../missions/catalog'
import {
  completeOnboarding,
  createInitialOsProgress,
  recordMissionCompletion,
  startMission,
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
  it('shows IA Prática and the 3-mission Dev rail without extra voxel or l15-l17', async () => {
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
          learner={anonymousPublicLearner}
          catalog={new GeneratedMissionCatalogRepository()}
          onLaunch={vi.fn()}
          onBack={vi.fn()}
        />
      </ServicesProvider>,
    )

    expect(screen.getByRole('heading', { name: '6 missões, uma sequência' })).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'WAREHOUSE: Key-Value Store (in-memory)', level: 3 })).not.toBeNull()
    expect(screen.queryByText(/PIPELINE PLANT/)).toBeNull()
    expect(screen.queryByText(/CHECKPOINT CITY/)).toBeNull()
    expect(screen.queryByRole('heading', { name: /l15/i })).toBeNull()
    expect(screen.getAllByText('Bloqueada por pré-requisito').length).toBeGreaterThan(0)
    await waitFor(() => expect(screen.getByText('Verificação independente concluída')).not.toBeNull())
    expect(screen.queryByText('Competência canônica verificada')).toBeNull()
  })

  it('does not claim canonical mastery on WAREHOUSE for an anonymous learner', async () => {
    const progress = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'build-systems',
      context: 'personal-project',
      confidence: 'high',
      selectedTrackId: 'dev',
    })
    const services = createServices({ verification: verificationService() })

    render(
      <ServicesProvider services={services}>
        <MapScreen
          progress={progress}
          learner={anonymousPublicLearner}
          catalog={new GeneratedMissionCatalogRepository()}
          onLaunch={vi.fn()}
          onBack={vi.fn()}
        />
      </ServicesProvider>,
    )

    expect(anonymousPublicLearner.masteredCount).toBe(0)
    expect(screen.getByTestId('map-overlay-game-02-warehouse').textContent).not.toBe(
      'Competência canônica verificada',
    )
    expect(screen.queryByText('Competência canônica verificada')).toBeNull()
  })
})

function verificationServiceWithVerdict(verdict: 'PASS' | 'FAIL'): VerificationService {
  return {
    async accept() { return { kind: 'not-submitted' } },
    async retry() { return { kind: 'not-submitted' } },
    async latest(mission) {
      return mission.id === 'l02'
        ? {
            kind: 'verified',
            evidenceDigest: 'a'.repeat(64),
            receipt: {
              verdict,
              context_isolated: true,
              source: 'independent-literacy-verifier',
              evidence_digest: 'a'.repeat(64),
              lesson_id: 'l02',
              activity_id: 'l02-a1',
              attempt_id: 'attempt-1',
              activity_type: 'output_comparison',
              score: 1,
              producer_pass_claim: true,
              independent_pass: verdict === 'PASS',
              mastery_eligible: verdict === 'PASS',
              errors: [],
              producer_writes_mastered: false,
              max_producer_claim: 'completed',
            },
          }
        : { kind: 'not-submitted' }
    },
  }
}

function renderMap(progress: ReturnType<typeof createInitialOsProgress>, services = createServices()) {
  render(
    <ServicesProvider services={services}>
      <MapScreen
        progress={progress}
        learner={anonymousPublicLearner}
        catalog={new GeneratedMissionCatalogRepository()}
        onLaunch={vi.fn()}
        onBack={vi.fn()}
      />
    </ServicesProvider>,
  )
}

/**
 * F1 2026-09-10-activation-first-activity (R3/plan P4): o mapa espelha a
 * recomendação do Hub (`recommendMission`, fonte única). Badge TEXTUAL
 * "Comece aqui" apenas para kinds start/resume; review/recuperação mantêm
 * labels próprios; overlays/travas inalterados; capítulo da trilha ativa
 * destacado no header.
 */
describe('chapter map — F1 R3: badge "Comece aqui" espelhando o Hub', () => {
  it('novato (trilha escolhida no onboarding) vê uma única badge no 1º nó disponível (kind start) e o capítulo ativo no header', () => {
    const progress = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })
    renderMap(progress)

    // Entrada recomendada da trilha ia-pratica é l02 (recommendedEntryMissionId).
    // Badge textual no DOM (nunca só-cor), não interativa (ordem de foco inalterada).
    const badge = screen.getByTestId('map-start-here-l02')
    expect(badge.textContent).toBe('Comece aqui')
    expect(badge.tagName).toBe('STRONG')
    expect(badge.hasAttribute('tabindex')).toBe(false)
    expect(screen.getAllByText('Comece aqui')).toHaveLength(1)
    // Overlay do nó e labels preservados; nenhum outro nó com badge.
    expect(screen.getByTestId('map-overlay-l02').textContent).toBe('Disponível')
    expect(screen.queryByTestId('map-start-here-l01')).toBeNull()
    expect(screen.queryByTestId('map-start-here-l03')).toBeNull()
    expect(screen.queryByTestId('map-start-here-game-02-warehouse')).toBeNull()
    // Capítulo da trilha ativa destacado no header.
    expect(screen.getByTestId('map-active-chapter').textContent).toContain('IA Prática')
  })

  it('aprendiz com missão in_progress vê a badge no resume (kind resume), overlay Em andamento preservado', () => {
    const l02 = missionCatalog.missions.find((mission) => mission.id === 'l02')
    if (l02 === undefined) throw new Error('Expected l02')
    let progress = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })
    progress = startMission(progress, l02)
    renderMap(progress)

    expect(screen.getByTestId('map-start-here-l02').textContent).toBe('Comece aqui')
    expect(screen.getAllByText('Comece aqui')).toHaveLength(1)
    expect(screen.getByTestId('map-overlay-l02').textContent).toBe('Em andamento')
  })

  it('kind retry (verificação FAIL sem missão à frente) NÃO recebe badge; overlay de verificação preservado', async () => {
    let progress = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })
    // A trilha ia-pratica inteira concluída (ordem numérica = ordem topológica
    // das pré-requisitos): nenhuma missão à frente ⇒ o retry de l02 (verificação
    // FAIL) não é adiado e a recomendação reage ao verdict carregado.
    const aiPraticaMissions = missionCatalog.missions
      .filter((mission) => mission.trackId === 'ai-pratica')
      .sort((left, right) => left.id.localeCompare(right.id, 'en', { numeric: true }))
    for (const mission of aiPraticaMissions) {
      progress = recordMissionCompletion(progress, mission, missionCatalog)
    }
    renderMap(progress, createServices({ verification: verificationServiceWithVerdict('FAIL') }))

    // A recomendação reage à verificação carregada: retry de l02 (não start/resume)
    // ⇒ nenhuma badge permanece no mapa.
    await waitFor(() => {
      expect(screen.queryByText('Comece aqui')).toBeNull()
    })
    expect(screen.getByTestId('map-overlay-l02').textContent).toBe(
      'Verificação independente concluída',
    )
    expect(screen.getByTestId('map-active-chapter').textContent).toContain('IA Prática')
  })

  it('kind review (revisão canônica devida) NÃO recebe badge; label próprio do overlay mantido', () => {
    const l02 = missionCatalog.missions.find((mission) => mission.id === 'l02')
    if (l02 === undefined) throw new Error('Expected l02')
    let progress = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })
    progress = recordMissionCompletion(progress, l02, missionCatalog, 'l03')
    const learnerWithDueReview = {
      ...anonymousPublicLearner,
      nextReviews: [
        {
          unitId: 'ai-literacy:l02',
          title: 'IA não é uma fonte de verdade',
          dueIn: 'hoje',
          reason: 'due',
        },
      ] as const,
    }
    render(
      <ServicesProvider services={createServices()}>
        <MapScreen
          progress={progress}
          learner={learnerWithDueReview}
          catalog={new GeneratedMissionCatalogRepository()}
          onLaunch={vi.fn()}
          onBack={vi.fn()}
        />
      </ServicesProvider>,
    )

    expect(screen.queryByText('Comece aqui')).toBeNull()
    expect(screen.getByTestId('map-overlay-l02').textContent).toBe('Concluída neste dispositivo')
    expect(screen.getByTestId('map-active-chapter').textContent).toContain('IA Prática')
  })

  it('trilha dev selecionada no onboarding: badge no 1º nó dev (start) e capítulo Dev destacado', () => {
    const progress = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'build-systems',
      context: 'personal-project',
      confidence: 'high',
      selectedTrackId: 'dev',
    })
    renderMap(progress)

    expect(screen.getByTestId('map-start-here-game-02-warehouse').textContent).toBe('Comece aqui')
    expect(screen.getAllByText('Comece aqui')).toHaveLength(1)
    expect(screen.getByTestId('map-active-chapter').textContent).toContain('Dev')
  })
})

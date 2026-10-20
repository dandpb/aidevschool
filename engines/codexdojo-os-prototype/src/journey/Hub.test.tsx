import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ServicesProvider } from '../app/ServicesProvider'
import { createServices } from '../app/createServices'
import { anonymousPublicLearner } from '../data/anonymousLearner'
import { learnerSnapshot } from '../data/learner'
import { missionCatalog } from '../data/missions'
import { GeneratedMissionCatalogRepository } from '../missions/catalog'
import { completeOnboarding, createInitialOsProgress, missionKey, recordMissionCompletion } from '../progress/domain'
import type { VerificationService } from '../verification/ports'
import { Hub } from './Hub'

const verification: VerificationService = {
  async accept() { return { kind: 'not-submitted' } },
  async retry() { return { kind: 'not-submitted' } },
  async latest() { return { kind: 'not-submitted' } },
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
          learner={anonymousPublicLearner}
          catalog={new GeneratedMissionCatalogRepository()}
          onLaunch={vi.fn()}
          onOpenMap={vi.fn()}
          onOpenProgress={onOpenProgress}
        />
      </ServicesProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'O que a IA faz bem e onde costuma falhar' })).not.toBeNull()
    })
    expect(screen.getByText('25', { selector: '.hub-chips strong' })).not.toBeNull()
    expect(screen.getByTestId('canonical-mastery-count').textContent).toBe(
      '0 competências verificadas',
    )
    expect(screen.getByText(/Uma pausa não remove XP/)).not.toBeNull()
    expect(screen.queryByText(/\bvidas?\b|\benergia\b/i)).toBeNull()
    expect(screen.queryByText(/Trilha Dev/)).toBeNull()
    expect(screen.queryByRole('link', { name: /Desktop legado/i })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Entender meu progresso' }))
    expect(onOpenProgress).toHaveBeenCalledOnce()
  })

  it('shows masteredCount 0 for an anonymous public learner', async () => {
    const progress = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })
    const services = createServices({ verification })

    render(
      <ServicesProvider services={services}>
        <Hub
          progress={progress}
          learner={anonymousPublicLearner}
          catalog={new GeneratedMissionCatalogRepository()}
          onLaunch={vi.fn()}
          onOpenMap={vi.fn()}
          onOpenProgress={vi.fn()}
        />
      </ServicesProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('canonical-mastery-count').textContent).toBe(
        '0 competências verificadas',
      )
    })
  })

  // AID-5190/W7 (contrato §7.2): o hub público permanece anônimo (ec534f7),
  // então o papel ReviewDue é coberto aqui com a projeção canônica real
  // (learnerSnapshot: U2-key-value-store overdue 4d) e progresso dev
  // concluído — mesma cobertura determinística da superfície de prioridade
  // de revisão (recommendation.test.ts).
  it('AID-5190/W7: hud-review-due com reason+dueIn pt-BR e medidor com valuetext + leitura X/Y', async () => {
    let progress = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'build-systems',
      context: 'personal-project',
      confidence: 'high',
      selectedTrackId: 'dev',
    })
    for (const mission of new GeneratedMissionCatalogRepository().listLaunchable('dev')) {
      if (progress.missionStatusByKey[missionKey('dev', mission.id)] === 'completed') continue
      progress = recordMissionCompletion(progress, mission, missionCatalog, undefined, {
        now: new Date('2026-07-20T10:00:00-03:00'),
      })
    }
    const services = createServices({
      verification,
      clock: () => new Date('2026-10-19T10:00:00-03:00'),
    })

    render(
      <ServicesProvider services={services}>
        <Hub
          progress={progress}
          learner={learnerSnapshot}
          catalog={new GeneratedMissionCatalogRepository()}
          onLaunch={vi.fn()}
          onOpenMap={vi.fn()}
          onOpenProgress={vi.fn()}
        />
      </ServicesProvider>,
    )

    // ReviewDue: reason + dueIn pt-BR ("overdue 4d" → "atrasada 4 dias").
    await waitFor(() => {
      expect(screen.getByTestId('hud-review-due').textContent).toBe('Revisão atrasada 4 dias')
    })
    // ProgressMeter (B9c): role=progressbar + valuetext "N% concluído".
    const meter = screen.getByTestId('hud-progress')
    expect(meter.getAttribute('role')).toBe('progressbar')
    expect(meter.getAttribute('aria-valuetext')).toBe('100% concluído')
    // Leitura textual "X/Y missões" adjacente (nunca só barra) — o strong
    // quebra o text node, então a leitura é feita do parágrafo inteiro.
    const meterRead = document.querySelector('.hub-meter-read')
    expect(meterRead?.textContent).toBe('3/3 missões concluídas')
    // StreakChip: texto de sequência/ritmo local + glifo decorativo aria-hidden.
    const streak = screen.getByTestId('hud-streak')
    expect(streak.textContent).toMatch(/Sequência local|ritmo/)
    expect(streak.querySelector("[aria-hidden='true']")).not.toBeNull()
    // Live region: anúncio do ritmo local após o render (1×/sessão).
    await waitFor(() => {
      expect(screen.getByTestId('hud-live-region').textContent).toContain('Meta de hoje')
    })
  })
})

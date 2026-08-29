import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ServicesProvider } from '../app/ServicesProvider'
import { createServices } from '../app/createServices'
import { missionCatalog } from '../data/missions'
import { learnerSnapshot } from '../data/learner'
import type { MissionDefinition } from '../domain'
import type {
  EvidenceSubmission,
  EvidenceVerificationState,
  VerificationService,
} from '../verification/ports'
import { createInitialRendererState } from '../rendering/domain'
import {
  MissionSessionController,
  type MissionSessionControllerInput,
} from './MissionSessionController'
import { MissionShell } from './MissionShell'

class CompletingSession extends MissionSessionController {
  constructor(private readonly testInput: MissionSessionControllerInput) {
    super(testInput)
  }

  override start(): void {
    this.testInput.onState({
      phase: 'completed',
      stage: 'apply',
      progress: 1,
      renderer: createInitialRendererState(),
    })
  }

  override close(): void {}
}

class CompletingEvidenceSession extends MissionSessionController {
  constructor(private readonly testInput: MissionSessionControllerInput) {
    super(testInput)
  }

  override start(): void {
    this.testInput.onState({
      phase: 'completed',
      stage: 'apply',
      progress: 1,
      renderer: createInitialRendererState(),
    })
    void this.testInput.onEvidence({
      evidenceId: 'test-evidence',
      schemaId: this.testInput.mission.evidence.schema,
      schemaVersion: this.testInput.mission.evidence.version,
      engineId: this.testInput.mission.runtime.engineId,
      missionRunId: 'test-run',
      subject: {
        missionId: this.testInput.mission.id,
        unitId: this.testInput.mission.unitId,
      },
      record: {},
    } satisfies EvidenceSubmission)
  }

  override close(): void {}
}

const verification: VerificationService = {
  async accept(_mission, _submission, onState) {
    const state = { kind: 'rejected', code: 'unused' } as const
    onState?.(state)
    return state
  },
  async latest() {
    return { kind: 'not-submitted' }
  },
  async retry() {
    return { kind: 'rejected', code: 'unused' }
  },
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('MissionShell completion persistence', () => {
  it('surfaces a failed save and retries instead of marking it complete', async () => {
    const mission = missionCatalog.missions[0]
    if (mission === undefined) throw new Error('Expected pilot mission')
    const onComplete = vi
      .fn<(mission: MissionDefinition) => Promise<undefined>>()
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValueOnce(undefined)
    const services = createServices({
      verification,
      host: {
        createSession(input) {
          return new CompletingSession(input)
        },
      },
    })

    render(
      <ServicesProvider services={services}>
        <MissionShell
          mission={mission}
          learner={learnerSnapshot}
          onComplete={onComplete}
          onReturn={() => undefined}
        />
      </ServicesProvider>,
    )
    fireEvent.load(screen.getByTitle(`Missão ${mission.title}`))

    expect((await screen.findByRole('alert')).textContent).toContain('conclusão local')
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '← Hub' })).toHaveProperty('disabled', true)

    fireEvent.click(screen.getByRole('button', { name: /tentar salvar novamente/i }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('keeps a completed Literacy mission open until its pending verification reaches a terminal state', async () => {
    const mission = missionCatalog.missions.find((item) => item.evidence.schema === 'literacy-evidence')
    if (mission === undefined) throw new Error('Expected Literacy mission')
    let finishVerification: (state: EvidenceVerificationState) => void = () => undefined
    const deferredVerification: VerificationService = {
      accept(_mission, _submission, onState) {
        onState?.({ kind: 'pending', storageId: 'test-run' })
        return new Promise((resolve) => {
          finishVerification = (state) => {
            onState?.(state)
            resolve(state)
          }
        })
      },
      async latest() {
        return { kind: 'not-submitted' }
      },
      async retry() {
        return { kind: 'rejected', code: 'unused' }
      },
    }
    const onReturn = vi.fn()
    const services = createServices({
      verification: deferredVerification,
      host: {
        createSession(input) {
          return new CompletingEvidenceSession(input)
        },
      },
    })

    render(
      <ServicesProvider services={services}>
        <MissionShell
          mission={mission}
          learner={learnerSnapshot}
          onComplete={async () => undefined}
          onReturn={onReturn}
        />
      </ServicesProvider>,
    )
    fireEvent.load(screen.getByTitle(`Missão ${mission.title}`))

    expect(await screen.findByText('Aguardando verificador independente')).toBeTruthy()
    const returnButton = screen.getByRole('button', { name: '← Hub' })
    expect(returnButton).toHaveProperty('disabled', true)
    fireEvent.click(returnButton)
    expect(onReturn).not.toHaveBeenCalled()

    await act(async () => {
      finishVerification({ kind: 'rejected', code: 'test-rejection' })
    })

    expect(await screen.findByText('Evidência rejeitada')).toBeTruthy()
    expect(returnButton).toHaveProperty('disabled', false)
    fireEvent.click(returnButton)
    expect(onReturn).toHaveBeenCalledTimes(1)
  })

  it('allows a teaching-game mission to return after its verifier reaches a terminal state', async () => {
    const mission = missionCatalog.missions.find((item) => item.evidence.schema === 'teaching-game-evidence')
    if (mission === undefined) throw new Error('Expected teaching-game mission')
    const onReturn = vi.fn()
    const services = createServices({
      verification,
      host: {
        createSession(input) {
          return new CompletingEvidenceSession(input)
        },
      },
    })

    render(
      <ServicesProvider services={services}>
        <MissionShell
          mission={mission}
          learner={learnerSnapshot}
          onComplete={async () => undefined}
          onReturn={onReturn}
        />
      </ServicesProvider>,
    )
    fireEvent.load(screen.getByTitle(`Missão ${mission.title}`))

    expect(await screen.findByText('Evidência rejeitada')).toBeTruthy()
    const returnButton = screen.getByRole('button', { name: '← Hub' })
    await waitFor(() => expect(returnButton).toHaveProperty('disabled', false))
    fireEvent.click(returnButton)
    expect(onReturn).toHaveBeenCalledTimes(1)
  })
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ServicesProvider } from '../app/ServicesProvider'
import { createServices } from '../app/createServices'
import { missionCatalog } from '../data/missions'
import { learnerSnapshot } from '../data/learner'
import type { MissionDefinition } from '../domain'
import type { VerificationService } from '../verification/ports'
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
    })
  }

  override close(): void {}
}

const verification: VerificationService = {
  async accept() {
    return { kind: 'rejected', code: 'unused' }
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
      .fn<(mission: MissionDefinition) => Promise<void>>()
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

    expect(await screen.findByText('Não foi possível salvar a conclusão local.')).toBeTruthy()
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '← Hub' })).toHaveProperty('disabled', true)

    fireEvent.click(screen.getByRole('button', { name: 'Tentar salvar novamente' }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(2))
    await waitFor(() =>
      expect(screen.queryByText('Não foi possível salvar a conclusão local.')).toBeNull(),
    )
  })
})

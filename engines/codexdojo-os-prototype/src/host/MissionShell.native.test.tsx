import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ServicesProvider } from '../app/ServicesProvider'
import { createServices } from '../app/createServices'
import { guidedPracticeProjection } from '../data/generated/guidedPractice'
import { missionCatalog } from '../data/missions'
import { learnerSnapshot } from '../data/learner'
import { GuidedPracticeApp } from '../practice/GuidedPracticeApp'
import {
  GeneratedMissionCatalogRepository,
} from '../missions/catalog'
import { MissionShell } from './MissionShell'

const nativeMission = missionCatalog.missions.find((mission) => mission.id === 'pg-d01')

function criterionScope(criterionId: string) {
  const marker = screen.getByText(criterionId)
  const item = marker.closest('li')
  if (item === null) throw new Error(`criterion ${criterionId} not rendered`)
  return within(item)
}

async function concludePracticeCycle() {
  fireEvent.click(screen.getByRole('button', { name: /li o exemplo e vou para a tentativa/i }))
  for (let index = 1; index <= guidedPracticeProjection.attemptSteps.length; index += 1) {
    fireEvent.change(screen.getByLabelText(`Evidência do passo ${index}`), {
      target: { value: `$ cmd ${index}\nsaída real ${index}` },
    })
  }
  fireEvent.click(screen.getByRole('button', { name: /concluir a tentativa/i }))
  for (const criterion of guidedPracticeProjection.rubric) {
    const scope = criterionScope(criterion.id)
    fireEvent.click(scope.getByText(criterion.id))
    fireEvent.click(scope.getByLabelText('Atendido', { exact: true }))
    fireEvent.change(scope.getByLabelText(`Evidência do critério ${criterion.id}`), {
      target: { value: 'comando + saída citados' },
    })
  }
  fireEvent.click(screen.getByRole('button', { name: /ir para o takeaway/i }))
  fireEvent.change(screen.getByLabelText(/\(a\)/), { target: { value: 'a fronteira 6.0 não era testada' } })
  fireEvent.change(screen.getByLabelText(/\(b\)/), { target: { value: 'o caso mínimo com saída real' } })
  fireEvent.click(screen.getByRole('button', { name: /concluir a prática/i }))
}

describe('OS-native guided-practice mission (AID-3527, dev:pg-d01)', () => {
  it('is registered in the generated catalog with the pinned parity content version', () => {
    expect(nativeMission).toBeDefined()
    if (nativeMission === undefined) throw new Error('pg-d01 missing from generated catalog')
    expect(nativeMission.trackId).toBe('dev')
    expect(nativeMission.chapterOrder).toBe(17)
    expect(nativeMission.prerequisites).toEqual(['l21', 'l27'])
    expect(nativeMission.runtime).toEqual({
      engineId: 'codexdojo-os',
      appId: 'practice',
      protocolVersion: '1.0',
      contentVersion: guidedPracticeProjection.contentVersion,
    })
    expect(nativeMission.evidence).toEqual({
      schema: 'guided-practice-evidence',
      version: 1,
      verifierRequired: true,
    })
    const devMissions = missionCatalog.missions.filter((mission) => mission.trackId === 'dev')
    expect(devMissions).toHaveLength(17)
    expect(devMissions.map((mission) => mission.chapterOrder)).toEqual(
      Array.from({ length: 17 }, (_unused, index) => index + 1),
    )
  })

  it('refuses a runtime URL for OS-native missions (no host engine)', () => {
    if (nativeMission === undefined) throw new Error('pg-d01 missing from generated catalog')
    const repository = new GeneratedMissionCatalogRepository()
    expect(() => repository.runtimeUrl(nativeMission)).toThrow(/OS-native/)
  })

  it('runs the guided cycle inside MissionShell and completes without an engine iframe', async () => {
    if (nativeMission === undefined) throw new Error('pg-d01 missing from generated catalog')
    const onComplete = vi
      .fn<(mission: NonNullable<typeof nativeMission>) => Promise<undefined>>()
      .mockResolvedValue(undefined)
    const services = createServices({})
    render(
      <ServicesProvider services={services}>
        <MissionShell
          mission={nativeMission}
          learner={learnerSnapshot}
          onComplete={onComplete}
          onReturn={() => undefined}
        />
      </ServicesProvider>,
    )

    expect(screen.queryByTitle(`Missão ${nativeMission.title}`)).toBeNull()
    expect(screen.getByText('Prática guiada · 40 min')).toBeTruthy()
    expect(screen.getByRole('heading', { name: /exemplo trabalhado/i })).toBeTruthy()

    await concludePracticeCycle()

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(onComplete.mock.calls[0]?.[0]?.id).toBe('pg-d01')
  })

  it('signals conclusion exactly once per concluded cycle', async () => {
    const onConcluded = vi.fn()
    render(<GuidedPracticeApp onConcluded={onConcluded} />)
    expect(onConcluded).not.toHaveBeenCalled()
    await concludePracticeCycle()
    await waitFor(() => expect(onConcluded).toHaveBeenCalledTimes(1))
    expect(onConcluded).not.toHaveBeenCalledTimes(2)
  })
})

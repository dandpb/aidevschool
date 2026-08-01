import { describe, expect, it, vi } from 'vitest'
import { runProcess } from './processRunner'
import { routeBridgeRequest } from './router'
import {
  literacyReceipt,
  literacyRecord,
  relayRecord,
  teachingGameRecord,
  wormholeRecord,
} from './routerVerificationRecords'

describe('verification bridge dispatch', () => {
  it('accepts exponent-valued evidence from the real Python digest authority', async () => {
    const response = await routeBridgeRequest({
      method: 'POST',
      pathname: '/__dojo/bridge/v1/verification',
      body: JSON.stringify({
        schemaId: 'literacy-evidence',
        schemaVersion: 1,
        record: literacyRecord,
      }),
    }, runProcess)

    expect(response.status).toBe(200)
    expect(response.body.receipt).toMatchObject({
      evidence_digest: '7a8ce7a60bb9fbf95140be49b4160c6e9055ac42c1f2967c94de622eadd862f4',
      lesson_id: 'l02',
      producer_pass_claim: true,
    })
  })

  it('dispatches a declared schema to one fixed verifier process', async () => {
    const executor = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify(literacyReceipt()),
      stderr: '',
    })

    const response = await routeBridgeRequest({
      method: 'POST',
      pathname: '/__dojo/bridge/v1/verification',
      body: JSON.stringify({
        schemaId: 'literacy-evidence',
        schemaVersion: 1,
        record: literacyRecord,
      }),
    }, executor)

    expect(response.status).toBe(200)
    expect(response.body.receipt).toEqual(literacyReceipt())
    expect(executor).toHaveBeenCalledWith(
      expect.objectContaining({
        executable: 'python3',
        args: ['-m', 'learner.gate.literacy_bridge'],
      }),
      JSON.stringify(literacyRecord),
    )
  })

  it('dispatches teaching-game evidence to the fixed WAREHOUSE verifier', async () => {
    const response = await routeBridgeRequest({
      method: 'POST',
      pathname: '/__dojo/bridge/v1/verification',
      body: JSON.stringify({
        schemaId: 'teaching-game-evidence',
        schemaVersion: 1,
        record: teachingGameRecord,
      }),
    }, runProcess)

    expect(response.status).toBe(200)
    expect(response.body.receipt).toMatchObject({
      source: 'independent-teaching-game-verifier',
      verdict: 'PASS',
      unit_id: 'U2-key-value-store',
      scenario_id: 'kv-warehouse-L1',
      producer_pass_claim: true,
      canonical_gate_status: 'not-submitted',
    })
  })

  it.each([
    ['WORMHOLE', wormholeRecord],
    ['RELAY STATION', relayRecord],
  ])('dispatches %s evidence through the same fixed teaching-game process', async (_, record) => {
    const response = await routeBridgeRequest({
      method: 'POST',
      pathname: '/__dojo/bridge/v1/verification',
      body: JSON.stringify({
        schemaId: 'teaching-game-evidence',
        schemaVersion: 1,
        record,
      }),
    }, runProcess)

    expect(response.status).toBe(200)
    expect(response.body.receipt).toMatchObject({
      source: 'independent-teaching-game-verifier',
      verdict: 'PASS',
      unit_id: record.unit_id,
      project: record.project,
      scenario_id: record.scenario_id,
      game: record.game,
      producer_pass_claim: true,
    })
  })
})

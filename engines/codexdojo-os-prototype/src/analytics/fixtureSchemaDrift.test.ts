// @vitest-environment node
// Pure fixture-vs-vocabulary check; no DOM. The fixture loader (load_fixtures.mjs)
// reads files on the node side, which the jsdom environment would deny.
import { describe, expect, it } from 'vitest'
import {
  driftFixtureLines,
  exampleReportRaw,
  syntheticFixtureLines,
} from '../../../../learner/gate/tests/fixtures/analytics/load_fixtures.mjs'
import { analyticsEventIsValid } from './events'

// AID-473 F2 (branch-prep under AID-487): the committed NDJSON fixtures are the
// CI surface of the schema-drift monitor. This test validates every fixture
// line against the CANONICAL emission vocabulary (events.ts) directly — not
// the collector projection — so CI fails high here if the received-envelope
// fixtures and the closed vocabularies ever diverge. The offline monitor
// (learner/gate/analytics/schema_drift_monitor.mjs) reuses the same verdicts
// operationally via the parity-locked collector module; fixtures load through
// the node-side loader (load_fixtures.mjs) to keep this engine typecheck-free
// of node builtins.

describe('analytics fixture schema drift (events.ts is canonical)', () => {
  it('accepts every synthetic-fixture envelope', async () => {
    const lines = await syntheticFixtureLines()
    expect(lines.length).toBe(94)
    for (const entry of lines) {
      const event = JSON.parse(entry.line) as unknown
      expect(analyticsEventIsValid(event), `${entry.file}:${entry.number}`).toBe(true)
    }
  })

  it('rejects every drifted envelope except the valid baseline line', async () => {
    const lines = await driftFixtureLines()
    expect(lines).toHaveLength(12)
    const verdicts = lines.map((line) => {
      try {
        return analyticsEventIsValid(JSON.parse(line) as unknown)
      } catch {
        return false
      }
    })
    expect(verdicts.filter((valid) => valid)).toHaveLength(1)
    expect((JSON.parse(lines[0]) as { name: string }).name).toBe('onboarding.started')
  })

  it('ships an example report that stays aggregated and identifier-free', async () => {
    const raw = await exampleReportRaw()
    const report = JSON.parse(raw) as {
      reportVersion: number
      anonymity: { identifiersPublished: boolean; suppressedBuckets: number }
      source: { totalEvents: number }
    }
    expect(report.reportVersion).toBe(1)
    expect(report.anonymity.identifiersPublished).toBe(false)
    expect(report.anonymity.suppressedBuckets).toBeGreaterThan(0)
    expect(report.source.totalEvents).toBe(94)
    expect(raw.includes('install-')).toBe(false)
    expect(raw.includes('session-')).toBe(false)
  })
})

import type { LearnerSnapshot } from '../domain'

export const canonicalLearnerFixture = {
  activeUnit: {
    id: 'U-BRIDGE',
    title: 'Canonical bridge unit',
    project: '02_key_value_store',
    state: 'evaluating',
    retryCount: 1,
    retryLimit: 3,
  },
  gate: {
    implementationBlocked: true,
    unblockCondition: 'learner_attempt_evaluated',
  },
  profile: {
    dreyfus: 'proficient',
    bloom: 'analyze',
    activeLanguage: 'TypeScript',
    weeklyTimeHours: 5,
  },
  aidi: {
    current: 0.34,
    thresholdAmber: 0.6,
    thresholdRed: 0.75,
    measurementSource: 'self_reported',
    trend: [{ date: '2026-07-08', value: 0.34, measurementSource: 'self_reported' }],
  },
  topPitfalls: [],
  nextReviews: [
    {
      unitId: 'U-BRIDGE',
      title: 'Canonical bridge unit',
      dueIn: 'today',
      reason: 'due',
    },
  ],
  masteredCount: 2,
  scaffoldedCount: 16,
  streak: {
    current: 3,
    longest: 7,
    lastGateDate: '2026-07-08',
    freezesEquipped: 1,
    freezesMax: 2,
  },
  curr: 0,
  challenges: [],
  predictions: {
    count: 0,
    byMetric: {
      latency: { correct: 0, total: 0 },
      memory: { correct: 0, total: 0 },
      throughput: { correct: 0, total: 0 },
    },
  },
} as const satisfies LearnerSnapshot

export const emptyGeneratedLearnerFixture = {
  ...canonicalLearnerFixture,
  activeUnit: {
    id: 'unknown',
    title: 'Nenhuma unidade ativa',
    project: 'unknown',
    state: 'presenting',
    retryCount: 0,
    retryLimit: 3,
  },
  aidi: {
    ...canonicalLearnerFixture.aidi,
    trend: [],
  },
  topPitfalls: [],
  nextReviews: [],
  masteredCount: 0,
  scaffoldedCount: 0,
  streak: {
    current: 0,
    longest: 0,
    lastGateDate: null,
    freezesEquipped: 0,
    freezesMax: 2,
  },
} as const satisfies LearnerSnapshot

import type { LearnerSnapshot } from '../domain'

/** Public/anonymous OS learner. Never the author's learning_state.yaml. */
export const anonymousPublicLearner: LearnerSnapshot = {
  activeUnit: {
    id: '',
    title: '',
    project: '',
    state: 'presenting',
    retryCount: 0,
    retryLimit: 3,
  },
  gate: {
    implementationBlocked: false,
    unblockCondition: 'learner_attempt_evaluated',
  },
  profile: {
    dreyfus: 'novice',
    bloom: 'remember',
    activeLanguage: '',
    weeklyTimeHours: 0,
  },
  aidi: {
    current: 0,
    thresholdAmber: 0.6,
    thresholdRed: 0.75,
    measurementSource: 'self_reported',
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
  curr: 0,
  predictions: {
    count: 0,
    byMetric: {
      latency: { correct: 0, total: 0 },
      memory: { correct: 0, total: 0 },
      throughput: { correct: 0, total: 0 },
    },
  },
  challenges: [],
}

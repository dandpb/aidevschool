// AID-3643 (P2 LearningRail + P3 hierarchy): presentation-only helpers for
// the daily practice surface. Every learner-facing string here is either
// (a) verbatim from the pinned pg-c01 projection (objective, rules, ids,
// versions, pin digest) or (b) UI copy already accepted with PR #639 (the
// chooser label/title/detail and the "Prática simulada" header note) — no
// reauthoring, no new curriculum content, no Dev-style defaults invented for
// the daily contract (which has no title field by design).
import type { LearningContext } from '../domain'
import type { DailyGuidedPracticeProjection } from './guidedPracticeTypes'

// Single source for the accepted standalone-surface copy: the chooser label
// and the human title reuse the exact strings accepted in PR #639.
export const DAILY_PRACTICE_CHOICE = {
  id: 'pg-c01',
  label: 'pg-c01 · Cotidiano: dados mínimos e verificação',
  title: 'Cotidiano: dados mínimos e verificação',
  detail: 'Jornada ia_pratica — veredito binário suficiente/insuficiente, com retry.',
} as const

// Explicit LearningRail context for the standalone pg-c01 session (AID-3643
// P2): while pg-c01 is the selected content, the rail orients on the daily
// practice itself instead of the pg-d01 default ("Reproduza antes de
// perguntar" / "Execute a prática pg-d01"). Fields are mechanical
// compositions of pinned projection values plus accepted UI copy; switching
// back to pg-d01 restores the untouched core practice context.
export function dailyLearningContext(projection: DailyGuidedPracticeProjection): LearningContext {
  return {
    eyebrow: 'PRÁTICA GUIADA · COTIDIANO',
    title: DAILY_PRACTICE_CHOICE.title,
    summary: projection.objective,
    concepts: [
      {
        name: DAILY_PRACTICE_CHOICE.id,
        detail: 'Prática simulada — não gera nota, mastered ou certificado.',
      },
      {
        name: 'Projeção canônica',
        detail: `${projection.contentVersion} · ${projection.projectionPin.artifactSha256.slice(0, 12)}`,
      },
    ],
    challenge: projection.rules[0],
  }
}

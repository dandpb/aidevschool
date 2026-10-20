import { describe, expect, it } from 'vitest'
import { formatReviewDuePtBr } from './reviewMapping'

/**
 * AID-5190/W7 — contrato §7.2 (papel ReviewDue): o substrate emite `dueIn`
 * de máquina; a HUD do OS apresenta pt-BR legível. O hub público permanece
 * anônimo por design (ec534f7 — progression.smoke.spec.ts), então a
 * apresentação é coberta aqui + no Hub.test.tsx com learner sintético.
 */
describe('formatReviewDuePtBr (AID-5190/W7)', () => {
  it.each([
    ['overdue 43d', 'atrasada 43 dias'],
    ['overdue 1d', 'atrasada 1 dia'],
    ['today', 'devida hoje'],
    ['tomorrow', 'devida amanhã'],
    ['in 5d', 'em 5 dias'],
    ['in 1d', 'em 1 dia'],
  ])('mapeia %s → %s', (machine, ptBr) => {
    expect(formatReviewDuePtBr(machine)).toBe(ptBr)
  })

  it('passa adiante formatos desconhecidos sem inventar dados', () => {
    expect(formatReviewDuePtBr('custom label')).toBe('custom label')
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResultScreen } from './ResultScreen'

describe('mission result', () => {
  it('celebrates local rewards without converting a failed verdict into mastery', async () => {
    const onReturn = vi.fn()
    render(
      <ResultScreen
        completionStatus="saved"
        summary={{
          xpAwarded: 25,
          totalXp: 50,
          achievementsUnlocked: ['first-practice'],
        }}
        verification={{
          kind: 'verified',
          evidenceDigest: 'a'.repeat(64),
          receipt: {
            verdict: 'FAIL',
            context_isolated: true,
            source: 'independent-literacy-verifier',
            evidence_digest: 'a'.repeat(64),
            lesson_id: 'l02',
            activity_id: 'l02-a1',
            attempt_id: 'attempt-1',
            activity_type: 'output_comparison',
            score: 0.5,
            producer_pass_claim: false,
            independent_pass: false,
            mastery_eligible: false,
            errors: [],
            producer_writes_mastered: false,
            max_producer_claim: 'completed',
          },
        }}
        canonicalMasteryCount={2}
        onRetryVerification={vi.fn()}
        onRetrySave={vi.fn()}
        onReturn={onReturn}
      />,
    )

    expect(screen.getByText('+25 XP')).not.toBeNull()
    expect(screen.getByText(/critérios a melhorar/)).not.toBeNull()
    expect(screen.getByText(/gate canônico/i)).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Voltar ao hub' }))
    expect(onReturn).toHaveBeenCalledOnce()
    expect(screen.queryByTestId('support-cta')).toBeNull()
  })

  it('exposes the support email when verification is unavailable', () => {
    render(
      <ResultScreen
        completionStatus="saved"
        verification={{ kind: 'gateway-unavailable', storageId: 'run-1', retryable: true }}
        canonicalMasteryCount={0}
        onRetryVerification={vi.fn()}
        onRetrySave={vi.fn()}
        onReturn={vi.fn()}
      />,
    )

    expect(screen.getByTestId('support-whatsapp').getAttribute('href')).toBe(
      'https://wa.me/5511984363878',
    )
    expect(screen.getByTestId('support-email').getAttribute('href')).toContain(
      'mailto:daniel@heropa.com',
    )
    expect(screen.getByTestId('completion-is-not-mastery').textContent).toMatch(/não é/)
    expect(screen.getByText(/O verificador pode ser tentado novamente/)).not.toBeNull()
    expect(screen.queryByText('PASS')).toBeNull()
  })

  it('shows Veredito PASS beside completion-is-not-mastery', () => {
    render(
      <ResultScreen
        completionStatus="saved"
        summary={{
          xpAwarded: 25,
          totalXp: 50,
          achievementsUnlocked: [],
        }}
        verification={{
          kind: 'verified',
          evidenceDigest: 'a'.repeat(64),
          receipt: {
            verdict: 'PASS',
            context_isolated: true,
            source: 'independent-literacy-verifier',
            evidence_digest: 'a'.repeat(64),
            lesson_id: 'l02',
            activity_id: 'l02-a1',
            attempt_id: 'attempt-1',
            activity_type: 'output_comparison',
            score: 1,
            producer_pass_claim: true,
            independent_pass: true,
            mastery_eligible: true,
            errors: [],
            producer_writes_mastered: false,
            max_producer_claim: 'completed',
          },
        }}
        canonicalMasteryCount={2}
        onRetryVerification={vi.fn()}
        onRetrySave={vi.fn()}
        onReturn={vi.fn()}
      />,
    )

    expect(screen.getByTestId('independent-verdict').textContent).toBe('Veredito PASS')
    expect(screen.getByTestId('completion-is-not-mastery').textContent).toMatch(/não é/)
    expect(screen.getByText(/verificador independente aprovou/i)).not.toBeNull()
    expect(screen.queryByText(/domínio canônico/i)).toBeNull()
  })
})

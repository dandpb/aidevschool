import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Onboarding } from './Onboarding'

// AID-913: com a ativação da telemetria, o onboarding divulga a coleta de
// eventos anônimos com link para a página de privacidade estática.

describe('OS onboarding privacy disclosure (AID-913)', () => {
  it('linka o aviso de privacidade a partir da nota de progresso local', () => {
    render(<Onboarding onComplete={vi.fn()} />)

    const link = screen.getByRole('link', { name: /como usamos dados anônimos/i })
    expect(link.getAttribute('href')).toBe('/privacidade.html')
    expect(screen.getByText(/sem conta: o progresso fica neste dispositivo/i)).toBeTruthy()
  })
})

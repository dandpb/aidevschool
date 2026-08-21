import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PILOT_SUPPORT_EMAIL, supportWhatsAppHref } from '../supportContact'
import { SupportCta } from './SupportCta'

describe('SupportCta', () => {
  it('shows the support email and hides WhatsApp while the number slot is empty', () => {
    render(<SupportCta />)
    const email = screen.getByTestId('support-email')
    expect(email.getAttribute('href')).toContain(`mailto:${PILOT_SUPPORT_EMAIL}`)
    expect(email.textContent).toBe(PILOT_SUPPORT_EMAIL)
    expect(screen.queryByTestId('support-whatsapp')).toBeNull()
    expect(supportWhatsAppHref()).toBeNull()
  })
})

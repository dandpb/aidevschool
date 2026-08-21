import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PILOT_SUPPORT_EMAIL, supportWhatsAppHref } from '../supportContact'
import { SupportCta } from './SupportCta'

describe('SupportCta', () => {
  it('shows WhatsApp as primary and email as backup', () => {
    render(<SupportCta />)
    const whatsapp = screen.getByTestId('support-whatsapp')
    expect(whatsapp.getAttribute('href')).toBe('https://wa.me/5511984363878')
    expect(whatsapp.textContent).toBe('WhatsApp')
    const email = screen.getByTestId('support-email')
    expect(email.getAttribute('href')).toContain(`mailto:${PILOT_SUPPORT_EMAIL}`)
    expect(email.textContent).toBe(PILOT_SUPPORT_EMAIL)
    expect(supportWhatsAppHref()).toBe('https://wa.me/5511984363878')
  })
})

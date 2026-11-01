import { cleanup, render, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LandingPage } from '@/pages/landing'
import {
  COMPANY_NAME,
  CONTACT_EMAIL,
  LANDING_AUDIENCES,
  LANDING_FEATURES,
  PLATFORM_DESCRIPTION,
} from '@/pages/landing/model'

describe('LandingPage', () => {
  afterEach(cleanup)
  it('renders the product heading and description', () => {
    const { getByRole, getByText } = render(<LandingPage />)
    expect(getByRole('heading', { level: 1 }).textContent).toContain('Elevate Your Learning')
    expect(getByText(/competitive reinforcement testing platform/i)).toBeDefined()
  })

  it('describes the platform and who it is for', () => {
    const { getByText } = render(<LandingPage />)
    expect(getByText(PLATFORM_DESCRIPTION)).toBeDefined()
    for (const audience of LANDING_AUDIENCES) {
      expect(getByText(audience.label)).toBeDefined()
      expect(getByText(audience.description)).toBeDefined()
    }
  })

  it('links to the register and login pages', () => {
    const { getByRole } = render(<LandingPage />)
    expect(getByRole('link', { name: 'Register' }).getAttribute('href')).toBe('/register')
    expect(getByRole('link', { name: 'Login' }).getAttribute('href')).toBe('/login')
  })

  it('renders every feature card', () => {
    const { getByRole } = render(<LandingPage />)
    for (const feature of LANDING_FEATURES) {
      expect(getByRole('heading', { name: feature.title })).toBeDefined()
    }
  })

  it('shows the company contact email', () => {
    const { getByRole } = render(<LandingPage />)
    expect(getByRole('link', { name: CONTACT_EMAIL }).getAttribute('href')).toBe(
      `mailto:${CONTACT_EMAIL}`,
    )
  })

  it('shows a primary sign-up call to action with a login alternative', () => {
    const { getByRole } = render(<LandingPage />)
    expect(getByRole('link', { name: 'Get started' }).getAttribute('href')).toBe('/register')
    expect(getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe('/login')
  })

  it('renders the copyright notice', () => {
    const { getByRole, getByText } = render(<LandingPage />)
    const footerNav = getByRole('navigation', { name: 'Footer' })
    expect(within(footerNav).getByRole('link', { name: CONTACT_EMAIL }).getAttribute('href')).toBe(
      `mailto:${CONTACT_EMAIL}`,
    )
    expect(getByText(new RegExp(`© \\d{4} ${COMPANY_NAME}`))).toBeDefined()
  })
})

import { cleanup, render, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { LandingPage } from '@/pages/landing'
import {
  COMPANY_NAME,
  CONTACT_EMAIL,
  LANDING_AUDIENCES,
  LANDING_FEATURES,
  PLATFORM_DESCRIPTION,
} from '@/pages/landing/model'

function renderLandingPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )
}

describe('LandingPage', () => {
  afterEach(cleanup)
  it('renders the product heading and description', () => {
    const { getByRole, getByText } = renderLandingPage()
    expect(getByRole('heading', { level: 1 }).textContent).toContain('Elevate Your Learning')
    expect(getByText(/competitive reinforcement testing platform/i)).toBeDefined()
  })

  it('describes the platform and who it is for', () => {
    const { getByText } = renderLandingPage()
    expect(getByText(PLATFORM_DESCRIPTION)).toBeDefined()
    for (const audience of LANDING_AUDIENCES) {
      expect(getByText(audience.label)).toBeDefined()
      expect(getByText(audience.description)).toBeDefined()
    }
  })

  it('links to the register and login pages', () => {
    const { getByRole } = renderLandingPage()
    expect(getByRole('link', { name: 'Register' }).getAttribute('href')).toBe('/register')
    expect(getByRole('link', { name: 'Login' }).getAttribute('href')).toBe('/login')
  })

  it('renders every feature card', () => {
    const { getByRole } = renderLandingPage()
    for (const feature of LANDING_FEATURES) {
      expect(getByRole('heading', { name: feature.title })).toBeDefined()
    }
  })

  it('shows the company contact email', () => {
    const { getByRole } = renderLandingPage()
    expect(getByRole('link', { name: CONTACT_EMAIL }).getAttribute('href')).toBe(
      `mailto:${CONTACT_EMAIL}`,
    )
  })

  it('shows a primary sign-up call to action with a login alternative', () => {
    const { getByRole } = renderLandingPage()
    expect(getByRole('link', { name: 'Get started' }).getAttribute('href')).toBe('/register')
    expect(getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe('/login')
  })

  it('renders the copyright notice', () => {
    const { getByRole, getByText } = renderLandingPage()
    const footerNav = getByRole('navigation', { name: 'Footer' })
    expect(within(footerNav).getByRole('link', { name: CONTACT_EMAIL }).getAttribute('href')).toBe(
      `mailto:${CONTACT_EMAIL}`,
    )
    expect(getByText(new RegExp(`© \\d{4} ${COMPANY_NAME}`))).toBeDefined()
  })
})

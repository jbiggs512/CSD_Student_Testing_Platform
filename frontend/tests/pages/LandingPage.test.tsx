import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LandingPage } from '@/pages/landing'

describe('LandingPage', () => {
  it('renders the landing page heading', () => {
    const { getByText } = render(<LandingPage />)
    expect(getByText('Landing Page')).toBeDefined()
  })
})


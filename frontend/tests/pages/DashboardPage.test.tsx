import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DashboardPage } from '@/pages/dashboard'

describe('DashboardPage', () => {
  it('renders the dashboard page heading', () => {
    const { getByText } = render(<DashboardPage />)
    expect(getByText('Dashboard Page')).toBeDefined()
  })
})


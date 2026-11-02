import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { DashboardPage } from '@/pages/dashboard'

function renderDashboardPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  it('renders the dashboard page heading', () => {
    const { getByRole } = renderDashboardPage()
    expect(getByRole('heading', { level: 1 }).textContent).toContain('Welcome back')
  })
})


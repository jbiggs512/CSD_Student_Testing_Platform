import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { AdminDashboardPage } from '@/pages/adminDashboard'

describe('AdminDashboardPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows management links as cards', () => {
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Account management')).toBeDefined()
    expect(screen.getByText('Course management')).toBeDefined()
    expect(screen.getByText('Subject management')).toBeDefined()
    expect(screen.getByRole('link', { name: /Manage accounts/ }).getAttribute('href'))
      .toBe('/accounts')
    expect(screen.getByRole('link', { name: /Manage courses/ }).getAttribute('href'))
      .toBe('/courses')
    expect(screen.getByRole('link', { name: /Manage subjects/ }).getAttribute('href'))
      .toBe('/subjects')
  })
})

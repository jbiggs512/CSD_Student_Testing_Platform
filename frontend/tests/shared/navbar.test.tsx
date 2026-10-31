import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearAccessToken,
  getAccessToken,
  getCurrentUser,
  setAccessToken,
  setCurrentUser,
  type UserRole,
} from '@/shared/api'
import { NavBar } from '@/shared/components'

function seedRole(role: UserRole) {
  setAccessToken(`token-${role}`)
  setCurrentUser({
    user_id: 1,
    username: 'WS123456',
    first_name: 'Test',
    last_name: 'User',
    email: 'test@weston.ac.uk',
    role,
    account_status: 'active',
    registration_date: '2026-10-31',
    last_login: null,
  })
}

describe('NavBar', () => {
  beforeEach(() => {
    clearAccessToken()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders only the logo when no user is authenticated', () => {
    const { container } = render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>,
    )
    expect(container.querySelector('#nav-bar')).not.toBeNull()
    expect(screen.queryByText('Logout')).toBeNull()
  })

  it.each([
    ['student', ['Dashboard', 'Leaderboards', 'Statistics', 'Profile']],
    ['lecturer', ['Dashboard', 'Students', 'Tests', 'Profile']],
    ['admin', ['Dashboard', 'Lecturers', 'Subjects', 'Profile']],
  ] as const)(
    'renders %s navigation headings based on the authenticated user role',
    (role, expectedHeadings) => {
      seedRole(role)

      render(
        <MemoryRouter>
          <NavBar />
        </MemoryRouter>,
      )

      for (const heading of expectedHeadings) {
        expect(screen.getByText(heading)).toBeDefined()
      }
    },
  )

  it('clears the auth session when Logout is clicked', () => {
    seedRole('student')

    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText('Logout'))
    expect(getAccessToken()).toBeNull()
    expect(getCurrentUser()).toBeNull()
  })
})

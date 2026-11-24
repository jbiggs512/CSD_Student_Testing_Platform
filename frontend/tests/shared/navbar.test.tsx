import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

function renderNavBar() {
  return render(
    <MemoryRouter>
      <NavBar />
    </MemoryRouter>,
  )
}

describe('NavBar', () => {
  beforeEach(() => {
    clearAccessToken()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders only the logo when no user is authenticated', () => {
    const { container } = renderNavBar()
    expect(container.querySelector('#nav-bar')).not.toBeNull()
    expect(screen.queryByText('Logout')).toBeNull()
  })

  it.each([
    ['student', ['Dashboard', 'Leaderboards', 'Statistics'], 'Student'],
    ['lecturer', ['Dashboard', 'Students', 'Tests', 'Question Pool'], 'Lecturer'],
    ['admin', ['Dashboard', 'Courses', 'Accounts', 'Subjects', 'Teaching'], 'Admin'],
  ] as const)(
    'renders %s navigation headings and account type badge',
    (role, expectedHeadings, roleLabel) => {
      seedRole(role)

      renderNavBar()

      for (const heading of expectedHeadings) {
        expect(screen.getByText(heading)).toBeDefined()
      }
      expect(screen.getByText(roleLabel)).toBeDefined()
    },
  )

  it('opens the profile dropdown and shows user details', () => {
    seedRole('student')

    renderNavBar()

    fireEvent.click(screen.getByRole('button', { name: 'Profile menu' }))

    expect(screen.getByText('Test User')).toBeDefined()
    expect(screen.getByText('@WS123456')).toBeDefined()
    expect(screen.getByText('test@weston.ac.uk')).toBeDefined()
  })

  it('groups lecturer tools under Teaching for admins', async () => {
    seedRole('admin')

    renderNavBar()
    fireEvent.click(screen.getByRole('button', { name: 'Teaching' }))

    expect(await screen.findByText('Teaching dashboard')).toBeDefined()
    expect(screen.getByText('Students')).toBeDefined()
    expect(screen.getByText('Tests')).toBeDefined()
    expect(screen.getByText('Question Pool')).toBeDefined()
  })

  it('clears the auth session when Logout is clicked', () => {
    seedRole('student')

    renderNavBar()

    fireEvent.click(screen.getByRole('button', { name: 'Profile menu' }))
    fireEvent.click(screen.getByText('Logout'))
    expect(getAccessToken()).toBeNull()
    expect(getCurrentUser()).toBeNull()
  })

  it('calls /auth/logout endpoint with credentials when Logout is clicked', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
    seedRole('student')

    renderNavBar()

    fireEvent.click(screen.getByRole('button', { name: 'Profile menu' }))
    fireEvent.click(screen.getByText('Logout'))
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/auth/logout'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    )
  })
})

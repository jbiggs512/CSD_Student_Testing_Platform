import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LecturersPage } from '@/pages/lecturers'

const {
  getLecturers,
  createLecturer,
  updateLecturer,
  updateLecturerPassword,
  unlockLecturer,
  deleteLecturer,
} = vi.hoisted(() => ({
  getLecturers: vi.fn(),
  createLecturer: vi.fn(),
  updateLecturer: vi.fn(),
  updateLecturerPassword: vi.fn(),
  unlockLecturer: vi.fn(),
  deleteLecturer: vi.fn(),
}))

vi.mock('@/pages/lecturers/api', () => ({
  getLecturers,
  createLecturer,
  updateLecturer,
  updateLecturerPassword,
  unlockLecturer,
  deleteLecturer,
  LecturerApiError: class LecturerApiError extends Error {},
}))

const lecturer = {
  user_id: 1,
  username: 'jane.lecturer',
  first_name: 'Jane',
  last_name: 'Lecturer',
  email: 'jane@example.com',
  role: 'lecturer' as const,
  account_status: 'active' as const,
  registration_date: '2026-01-01',
  last_login: null,
}

const disabledLecturer = {
  ...lecturer,
  user_id: 2,
  username: 'alex.lecturer',
  first_name: 'Alex',
  last_name: 'Disabled',
  email: 'alex@example.com',
  account_status: 'disabled' as const,
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LecturersPage />
    </MemoryRouter>,
  )
}

describe('LecturersPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('displays accounts returned by the API including their role', async () => {
    getLecturers.mockResolvedValue([lecturer])

    renderPage()

    expect(await screen.findByText('Jane Lecturer')).toBeDefined()
    expect(screen.getByText('jane@example.com')).toBeDefined()
    expect(screen.getByText('lecturer')).toBeDefined()
  })

  it('shows an API error when lecturers cannot be loaded', async () => {
    getLecturers.mockRejectedValue(new Error('Unable to load lecturers.'))

    renderPage()

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Unable to load lecturers.',
    )
  })

  it('filters lecturers by search term and account status', async () => {
    getLecturers.mockResolvedValue([lecturer, disabledLecturer])

    renderPage()

    expect(await screen.findByText('Jane Lecturer')).toBeDefined()
    fireEvent.change(screen.getByLabelText('Search accounts'), {
      target: { value: 'alex' },
    })
    expect(screen.queryByText('Jane Lecturer')).toBeNull()
    expect(screen.getByText('Alex Disabled')).toBeDefined()

    fireEvent.change(screen.getByLabelText('Search accounts'), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'disabled' }))
    expect(screen.queryByText('Jane Lecturer')).toBeNull()
    expect(screen.getByText('Alex Disabled')).toBeDefined()
  })

  it('filters accounts by role', async () => {
    const admin = {
      ...lecturer,
      user_id: 3,
      username: 'admin.user',
      first_name: 'Ad',
      last_name: 'Min',
      role: 'admin' as const,
    }
    getLecturers.mockResolvedValue([lecturer, admin])

    renderPage()

    expect(await screen.findByText('Jane Lecturer')).toBeDefined()
    fireEvent.change(screen.getByLabelText('Filter accounts by role'), {
      target: { value: 'admin' },
    })
    expect(screen.queryByText('Jane Lecturer')).toBeNull()
    expect(screen.getByText('Ad Min')).toBeDefined()
    expect(screen.getByText('admin')).toBeDefined()
  })

  it('shows the empty and no-match states', async () => {
    getLecturers.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('No accounts yet')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Add your first account' }))
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeDefined()
  })

  it('creates a lecturer account from the admin form', async () => {
    getLecturers.mockResolvedValue([])
    createLecturer.mockResolvedValue(lecturer)

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Add account' }))
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'jane.lecturer' } })
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Lecturer' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByLabelText('Initial password'), { target: { value: 'Password123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(createLecturer).toHaveBeenCalledWith({
        username: 'jane.lecturer',
        first_name: 'Jane',
        last_name: 'Lecturer',
        email: 'jane@example.com',
        password: 'Password123!',
        role: 'lecturer',
      })
    })
  })

  it('creates an admin account when Admin is selected', async () => {
    getLecturers.mockResolvedValue([])
    createLecturer.mockResolvedValue({ ...lecturer, role: 'admin' })

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Add account' }))
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'new.admin' } })
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'New' } })
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Admin' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new.admin@example.com' } })
    fireEvent.change(screen.getByLabelText('Initial password'), { target: { value: 'Password123!' } })
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'admin' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(createLecturer).toHaveBeenCalledWith({
        username: 'new.admin',
        first_name: 'New',
        last_name: 'Admin',
        email: 'new.admin@example.com',
        password: 'Password123!',
        role: 'admin',
      })
    })
  })
  it('requires matching passwords before resetting a lecturer password', async () => {
    getLecturers.mockResolvedValue([lecturer])

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Reset password for jane.lecturer' }))
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Password123!' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Different123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Passwords do not match.',
    )
    expect(updateLecturerPassword).not.toHaveBeenCalled()
  })

  it('requires a long password before resetting a lecturer password', async () => {
    getLecturers.mockResolvedValue([lecturer])

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Reset password for jane.lecturer' }))
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Password must be at least 8 characters.',
    )
    expect(updateLecturerPassword).not.toHaveBeenCalled()
  })

  it('updates lecturer details and resets a lecturer password', async () => {
    getLecturers.mockResolvedValue([lecturer])
    updateLecturer.mockResolvedValue(lecturer)
    updateLecturerPassword.mockResolvedValue(lecturer)

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit jane.lecturer' }))
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Janet' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateLecturer).toHaveBeenCalledWith('jane.lecturer', {
        first_name: 'Janet',
        last_name: 'Lecturer',
        email: 'jane@example.com',
      })
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Reset password for jane.lecturer' }))
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'NewPassword123!' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'NewPassword123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    await waitFor(() => {
      expect(updateLecturerPassword).toHaveBeenCalledWith('jane.lecturer', {
        password: 'NewPassword123!',
      })
    })
  })

  it('disables and re-enables a lecturer account', async () => {
    getLecturers.mockResolvedValue([lecturer])
    updateLecturer.mockResolvedValue({ ...lecturer, account_status: 'disabled' })

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Disable jane.lecturer' }))

    await waitFor(() => {
      expect(updateLecturer).toHaveBeenCalledWith('jane.lecturer', {
        account_status: 'disabled',
      })
    })
  })

  it('enables a disabled lecturer account', async () => {
    getLecturers.mockResolvedValue([disabledLecturer])
    updateLecturer.mockResolvedValue({ ...disabledLecturer, account_status: 'active' })

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Enable alex.lecturer' }))

    await waitFor(() => {
      expect(updateLecturer).toHaveBeenCalledWith('alex.lecturer', {
        account_status: 'active',
      })
    })
  })

  it('shows errors from lecturer mutations', async () => {
    getLecturers.mockResolvedValue([lecturer])
    updateLecturer.mockRejectedValue(new Error('Unable to update lecturer.'))
    deleteLecturer.mockRejectedValue(new Error('Unable to delete lecturer.'))

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Disable jane.lecturer' }))
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Unable to update lecturer.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete jane.lecturer' }))
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/ }))
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Unable to delete lecturer.',
    )
  })

  it('confirms lecturer deletion before calling the API', async () => {
    getLecturers.mockResolvedValue([lecturer])
    deleteLecturer.mockResolvedValue(undefined)

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete jane.lecturer' }))
    expect(deleteLecturer).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /^Delete$/ }))

    await waitFor(() => {
      expect(deleteLecturer).toHaveBeenCalledWith('jane.lecturer')
    })
  })

  it('shows locked badge, filters by locked status, and unlocks a locked lecturer', async () => {
    const lockedLecturer = {
      ...lecturer,
      user_id: 3,
      username: 'locked.lecturer',
      first_name: 'Sam',
      last_name: 'Locked',
      failed_login_attempts: 5,
      locked_until: new Date(Date.now() + 9 * 60_000).toISOString(),
    }
    const expiredLecturer = {
      ...lecturer,
      user_id: 4,
      username: 'expired.lecturer',
      first_name: 'Pat',
      last_name: 'Expired',
      failed_login_attempts: 5,
      locked_until: new Date(Date.now() - 60_000).toISOString(),
    }

    getLecturers.mockResolvedValue([lecturer, lockedLecturer, expiredLecturer])
    unlockLecturer.mockResolvedValue({
      ...lockedLecturer,
      failed_login_attempts: 0,
      locked_until: null,
    })

    renderPage()

    expect(await screen.findByText('Sam Locked')).toBeDefined()
    expect(screen.getByText('Locked (9m)')).toBeDefined()
    expect(
      screen.getByRole('button', { name: 'Unlock locked.lecturer' }),
    ).toBeDefined()
    expect(
      screen.queryByRole('button', { name: 'Unlock expired.lecturer' }),
    ).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'locked' }))
    expect(screen.queryByText('Jane Lecturer')).toBeNull()
    expect(screen.queryByText('Pat Expired')).toBeNull()
    expect(screen.getByText('Sam Locked')).toBeDefined()

    fireEvent.click(
      screen.getByRole('button', { name: 'Unlock locked.lecturer' }),
    )
    await waitFor(() => {
      expect(unlockLecturer).toHaveBeenCalledWith('locked.lecturer')
    })
    expect(
      await screen.findByText('Account unlocked successfully.'),
    ).toBeDefined()
  })
})

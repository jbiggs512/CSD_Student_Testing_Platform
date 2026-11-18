import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LecturersPage } from '@/pages/lecturers'

const {
  getLecturers,
  createLecturer,
  updateLecturer,
  updateLecturerPassword,
  deleteLecturer,
} = vi.hoisted(() => ({
  getLecturers: vi.fn(),
  createLecturer: vi.fn(),
  updateLecturer: vi.fn(),
  updateLecturerPassword: vi.fn(),
  deleteLecturer: vi.fn(),
}))

vi.mock('@/pages/lecturers/api', () => ({
  getLecturers,
  createLecturer,
  updateLecturer,
  updateLecturerPassword,
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

  it('displays lecturers returned by the API', async () => {
    getLecturers.mockResolvedValue([lecturer])

    renderPage()

    expect(await screen.findByText('Jane Lecturer')).toBeDefined()
    expect(screen.getByText('jane@example.com')).toBeDefined()
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
    fireEvent.change(screen.getByLabelText('Search lecturers'), {
      target: { value: 'alex' },
    })
    expect(screen.queryByText('Jane Lecturer')).toBeNull()
    expect(screen.getByText('Alex Disabled')).toBeDefined()

    fireEvent.change(screen.getByLabelText('Search lecturers'), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'disabled' }))
    expect(screen.queryByText('Jane Lecturer')).toBeNull()
    expect(screen.getByText('Alex Disabled')).toBeDefined()
  })

  it('shows the empty and no-match states', async () => {
    getLecturers.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('No lecturers yet')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Add your first lecturer' }))
    expect(screen.getByRole('heading', { name: 'Create lecturer' })).toBeDefined()
  })

  it('creates a lecturer from the admin form', async () => {
    getLecturers.mockResolvedValue([])
    createLecturer.mockResolvedValue(lecturer)

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Add lecturer' }))
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'jane.lecturer' } })
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Lecturer' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByLabelText('Initial password'), { target: { value: 'Password123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create lecturer' }))

    await waitFor(() => {
      expect(createLecturer).toHaveBeenCalledWith({
        username: 'jane.lecturer',
        first_name: 'Jane',
        last_name: 'Lecturer',
        email: 'jane@example.com',
        password: 'Password123!',
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
})

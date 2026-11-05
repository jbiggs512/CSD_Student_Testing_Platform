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

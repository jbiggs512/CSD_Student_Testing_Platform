import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StudentsPage } from '@/pages/students'

const {
  getStudents,
  createStudent,
  updateStudent,
  approveStudent,
  deleteStudent,
} = vi.hoisted(() => ({
  getStudents: vi.fn(),
  createStudent: vi.fn(),
  updateStudent: vi.fn(),
  approveStudent: vi.fn(),
  deleteStudent: vi.fn(),
}))

vi.mock('@/pages/students/api', () => ({
  getStudents,
  createStudent,
  updateStudent,
  approveStudent,
  deleteStudent,
  StudentApiError: class StudentApiError extends Error {},
}))

const activeStudent = {
  user_id: 1,
  username: 'ws100001',
  first_name: 'Alex',
  last_name: 'Student',
  email: 'alex@example.com',
  role: 'student' as const,
  account_status: 'active' as const,
  registration_date: '2026-01-01',
  last_login: null,
}

const pendingStudent = {
  ...activeStudent,
  user_id: 2,
  username: 'ws100002',
  first_name: 'Pending',
  account_status: 'pending' as const,
}

function renderPage() {
  return render(
    <MemoryRouter>
      <StudentsPage />
    </MemoryRouter>,
  )
}

describe('StudentsPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('displays students returned by the API', async () => {
    getStudents.mockResolvedValue([activeStudent])

    renderPage()

    expect(await screen.findByText('Alex Student')).toBeDefined()
    expect(screen.getByText('alex@example.com')).toBeDefined()
    expect(screen.getAllByText('active').length).toBeGreaterThan(0)
  })

  it('creates a student from the lecturer form', async () => {
    getStudents.mockResolvedValue([])
    createStudent.mockResolvedValue(pendingStudent)

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Add student' }))
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ws100002' } })
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Pending' } })
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Student' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'pending@example.com' } })
    fireEvent.change(screen.getByLabelText('Initial password'), { target: { value: 'Password123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create student' }))

    await waitFor(() => {
      expect(createStudent).toHaveBeenCalledWith({
        username: 'ws100002',
        first_name: 'Pending',
        last_name: 'Student',
        email: 'pending@example.com',
        password: 'Password123!',
      })
    })
  })

  it('edits student details', async () => {
    getStudents.mockResolvedValue([activeStudent])
    updateStudent.mockResolvedValue({ ...activeStudent, first_name: 'Updated' })

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit ws100001' }))
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Updated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateStudent).toHaveBeenCalledWith('ws100001', {
        first_name: 'Updated',
        last_name: 'Student',
        email: 'alex@example.com',
      })
    })
  })

  it('approves pending students', async () => {
    getStudents.mockResolvedValue([pendingStudent])
    approveStudent.mockResolvedValue({ ...pendingStudent, account_status: 'active' })

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Approve ws100002' }))

    await waitFor(() => {
      expect(approveStudent).toHaveBeenCalledWith('ws100002')
    })
  })

  it('disables and re-enables students', async () => {
    getStudents.mockResolvedValue([activeStudent])
    updateStudent.mockResolvedValue({ ...activeStudent, account_status: 'disabled' })

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Disable ws100001' }))

    await waitFor(() => {
      expect(updateStudent).toHaveBeenCalledWith('ws100001', {
        account_status: 'disabled',
      })
    })
  })

  it('resets a student password after matching confirmation', async () => {
    getStudents.mockResolvedValue([activeStudent])
    updateStudent.mockResolvedValue(activeStudent)

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Reset password for ws100001' }))
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Password123!' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Password123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    await waitFor(() => {
      expect(updateStudent).toHaveBeenCalledWith('ws100001', {
        password: 'Password123!',
      })
    })
  })

  it('rejects mismatched student password confirmation', async () => {
    getStudents.mockResolvedValue([activeStudent])

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Reset password for ws100001' }))
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Password123!' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Different123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Passwords do not match.')
    expect(updateStudent).not.toHaveBeenCalled()
  })

  it('filters students by search and account status', async () => {
    getStudents.mockResolvedValue([activeStudent, pendingStudent])

    renderPage()
    await screen.findByText('Alex Student')
    fireEvent.click(screen.getByRole('button', { name: 'pending' }))

    expect(screen.queryByText('Alex Student')).toBeNull()
    expect(screen.getByText('Pending Student')).toBeDefined()
    fireEvent.change(screen.getByPlaceholderText('Search students...'), {
      target: { value: 'missing' },
    })
    expect(screen.getByText('No matching students')).toBeDefined()
  })

  it('confirms student deletion before calling the API', async () => {
    getStudents.mockResolvedValue([activeStudent])
    deleteStudent.mockResolvedValue(undefined)

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete ws100001' }))
    expect(deleteStudent).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/ }))

    await waitFor(() => {
      expect(deleteStudent).toHaveBeenCalledWith('ws100001')
    })
  })

  it('shows API errors while loading students', async () => {
    getStudents.mockRejectedValue(new Error('Unable to load students.'))

    renderPage()

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Unable to load students.',
    )
  })
})

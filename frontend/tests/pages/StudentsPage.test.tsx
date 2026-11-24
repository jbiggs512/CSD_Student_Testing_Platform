import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StudentsPage } from '@/pages/students'

const {
  getStudents,
  getCourses,
  createStudent,
  updateStudent,
  approveStudent,
  unlockStudent,
  deleteStudent,
} = vi.hoisted(() => ({
  getStudents: vi.fn(),
  getCourses: vi.fn(),
  createStudent: vi.fn(),
  updateStudent: vi.fn(),
  approveStudent: vi.fn(),
  unlockStudent: vi.fn(),
  deleteStudent: vi.fn(),
}))

vi.mock('@shared/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/api')>()
  return {
    ...actual,
    getCourses,
  }
})

vi.mock('@/pages/students/api', () => ({
  getStudents,
  createStudent,
  updateStudent,
  approveStudent,
  unlockStudent,
  deleteStudent,
  StudentApiError: class StudentApiError extends Error {},
}))

const softwareCourse = {
  course_id: 1,
  course_title: 'BSc Software Engineering',
}

const cyberCourse = {
  course_id: 2,
  course_title: 'BSc Cyber Security',
}

const defaultCourses = [softwareCourse, cyberCourse]

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
  courses: [softwareCourse],
}

const pendingStudent = {
  ...activeStudent,
  user_id: 2,
  username: 'ws100002',
  first_name: 'Pending',
  email: 'pending@example.com',
  account_status: 'pending' as const,
  courses: [cyberCourse],
}

const unassignedStudent = {
  ...activeStudent,
  user_id: 3,
  username: 'ws100003',
  first_name: 'NoCourse',
  email: 'unassigned@example.com',
  courses: [],
}

function renderPage() {
  getCourses.mockResolvedValue(defaultCourses)
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

  it('displays students and their assigned courses returned by the API', async () => {
    getStudents.mockResolvedValue([activeStudent, unassignedStudent])

    renderPage()

    expect(await screen.findByText('Alex Student')).toBeDefined()
    expect(screen.getByText('alex@example.com')).toBeDefined()
    expect(screen.getAllByText('BSc Software Engineering').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Unassigned').length).toBeGreaterThan(0)
    expect(screen.getAllByText('active').length).toBeGreaterThan(0)
  })

  it('creates a student with an optional course from the lecturer form', async () => {
    getStudents.mockResolvedValue([])
    createStudent.mockResolvedValue(pendingStudent)

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Add student' }))
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ws100002' } })
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Pending' } })
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Student' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'pending@example.com' } })
    fireEvent.change(screen.getByLabelText('Course'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Initial password'), { target: { value: 'Password123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create student' }))

    await waitFor(() => {
      expect(createStudent).toHaveBeenCalledWith({
        username: 'ws100002',
        first_name: 'Pending',
        last_name: 'Student',
        email: 'pending@example.com',
        password: 'Password123!',
        courses: [2],
      })
    })
  })

  it('edits student details and changes or clears assigned course', async () => {
    getStudents.mockResolvedValue([activeStudent])
    updateStudent.mockResolvedValue({
      ...activeStudent,
      first_name: 'Updated',
      courses: [cyberCourse],
    })

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit ws100001' }))
    const courseSelect = screen.getByLabelText('Course') as HTMLSelectElement
    expect(courseSelect.value).toBe('1')

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Updated' } })
    fireEvent.change(courseSelect, { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateStudent).toHaveBeenCalledWith('ws100001', {
        first_name: 'Updated',
        last_name: 'Student',
        email: 'alex@example.com',
        courses: [2],
      })
    })
  })

  it('clears a student course when set to unassigned while editing', async () => {
    getStudents.mockResolvedValue([activeStudent])
    updateStudent.mockResolvedValue({ ...activeStudent, courses: [] })

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit ws100001' }))
    fireEvent.change(screen.getByLabelText('Course'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateStudent).toHaveBeenCalledWith('ws100001', {
        first_name: 'Alex',
        last_name: 'Student',
        email: 'alex@example.com',
        courses: [],
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

  it('filters students by search, course, and account status', async () => {
    getStudents.mockResolvedValue([activeStudent, pendingStudent, unassignedStudent])

    renderPage()
    await screen.findByText('Alex Student')

    const courseFilter = screen.getByLabelText('Filter students by course')
    fireEvent.change(courseFilter, { target: { value: '1' } })
    expect(screen.getByText('Alex Student')).toBeDefined()
    expect(screen.queryByText('Pending Student')).toBeNull()
    expect(screen.queryByText('NoCourse Student')).toBeNull()

    fireEvent.change(courseFilter, { target: { value: 'unassigned' } })
    expect(screen.queryByText('Alex Student')).toBeNull()
    expect(screen.getByText('NoCourse Student')).toBeDefined()

    fireEvent.change(courseFilter, { target: { value: 'all' } })
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

  it('shows locked badge, filters by locked status, and unlocks a locked student', async () => {
    const futureLock = new Date(Date.now() + 12 * 60_000).toISOString()
    const expiredLock = new Date(Date.now() - 60_000).toISOString()
    const lockedStudent = {
      ...activeStudent,
      user_id: 3,
      username: 'ws100003',
      first_name: 'Locked',
      last_name: 'Learner',
      failed_login_attempts: 5,
      locked_until: futureLock,
    }
    const expiredStudent = {
      ...activeStudent,
      user_id: 4,
      username: 'ws100004',
      first_name: 'Expired',
      last_name: 'Learner',
      failed_login_attempts: 5,
      locked_until: expiredLock,
    }

    getStudents.mockResolvedValue([activeStudent, lockedStudent, expiredStudent])
    unlockStudent.mockResolvedValue({
      ...lockedStudent,
      failed_login_attempts: 0,
      locked_until: null,
    })

    renderPage()

    expect(await screen.findByText('Locked Learner')).toBeDefined()
    expect(screen.getByText('Locked (12m)')).toBeDefined()
    expect(
      screen.getByRole('button', { name: 'Unlock ws100003' }),
    ).toBeDefined()
    expect(
      screen.queryByRole('button', { name: 'Unlock ws100004' }),
    ).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'locked' }))
    expect(screen.queryByText('Alex Student')).toBeNull()
    expect(screen.queryByText('Expired Learner')).toBeNull()
    expect(screen.getByText('Locked Learner')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Unlock ws100003' }))
    await waitFor(() => {
      expect(unlockStudent).toHaveBeenCalledWith('ws100003')
    })
    expect(
      await screen.findByText('Student unlocked successfully.'),
    ).toBeDefined()
  })
})

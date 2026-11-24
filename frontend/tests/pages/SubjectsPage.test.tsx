import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SubjectsPage } from '@/pages/subjects'

const { getSubjects, getCourses, createSubject, updateSubject } = vi.hoisted(() => ({
  getSubjects: vi.fn(),
  getCourses: vi.fn(),
  createSubject: vi.fn(),
  updateSubject: vi.fn(),
}))

vi.mock('@/pages/subjects/api', () => ({
  getSubjects,
  getCourses,
  createSubject,
  updateSubject,
  SubjectApiError: class SubjectApiError extends Error {},
}))

const courses = [
  { course_id: 1, course_title: 'BSc Software Engineering' },
  { course_id: 2, course_title: 'BSc Computer Science' },
]

const subjects = [
  {
    subject_id: 1,
    subject_name: 'Software Testing',
    course_id: 1,
    course_title: 'BSc Software Engineering',
    status: 'active' as const,
  },
  {
    subject_id: 2,
    subject_name: 'Algorithms',
    course_id: 2,
    course_title: 'BSc Computer Science',
    status: 'disabled' as const,
  },
]

function renderSubjectsPage() {
  return render(
    <MemoryRouter>
      <SubjectsPage />
    </MemoryRouter>,
  )
}

describe('SubjectsPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('displays course titles in the subject list', async () => {
    getSubjects.mockResolvedValue(subjects)
    getCourses.mockResolvedValue(courses)

    renderSubjectsPage()

    expect(await screen.findByText('BSc Software Engineering')).toBeDefined()
    expect(screen.getByText('BSc Computer Science')).toBeDefined()
    expect(screen.queryByText('Course ID')).toBeNull()
  })

  it('loads available courses into the subject form', async () => {
    getSubjects.mockResolvedValue([])
    getCourses.mockResolvedValue(courses)

    renderSubjectsPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Add subject' }))

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'BSc Software Engineering' })).toBeDefined()
      expect(screen.getByRole('option', { name: 'BSc Computer Science' })).toBeDefined()
    })
  })

  it('sends a status-only request when disabling a subject', async () => {
    getSubjects.mockResolvedValue(subjects)
    getCourses.mockResolvedValue(courses)
    updateSubject.mockResolvedValue({
      ...subjects[0],
      status: 'disabled',
    })

    renderSubjectsPage()
    const disableButton = await screen.findByRole('button', {
      name: 'Disable Software Testing',
    })

    fireEvent.click(disableButton)

    await waitFor(() => {
      expect(updateSubject).toHaveBeenCalledWith(1, { status: 'disabled' })
    })
  })

  it('sends a status-only request when re-enabling a subject', async () => {
    getSubjects.mockResolvedValue(subjects)
    getCourses.mockResolvedValue(courses)
    updateSubject.mockResolvedValue({
      ...subjects[1],
      status: 'active',
    })

    renderSubjectsPage()
    fireEvent.click(await screen.findByRole('button', {
      name: 'Enable Algorithms',
    }))

    await waitFor(() => {
      expect(updateSubject).toHaveBeenCalledWith(2, { status: 'active' })
    })
  })

  it('shows API errors when subjects cannot be loaded', async () => {
    getSubjects.mockRejectedValue(new Error('Unable to load subjects.'))
    getCourses.mockResolvedValue(courses)

    renderSubjectsPage()

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Unable to load subjects.',
    )
  })

  it('shows duplicate errors when creating a subject', async () => {
    getSubjects.mockResolvedValue([])
    getCourses.mockResolvedValue(courses)
    createSubject.mockRejectedValue(new Error('Subject already exists for this course.'))

    renderSubjectsPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Add subject' }))
    fireEvent.change(screen.getByLabelText('Subject name'), {
      target: { value: 'Software Testing' },
    })
    fireEvent.change(screen.getByLabelText('Course'), {
      target: { value: '1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create subject' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Subject already exists for this course.',
    )
  })

  it('rejects a subject name containing only spaces with an alert', async () => {
    getSubjects.mockResolvedValue([])
    getCourses.mockResolvedValue(courses)

    renderSubjectsPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Add subject' }))
    fireEvent.change(screen.getByLabelText('Subject name'), {
      target: { value: '   ' },
    })
    fireEvent.change(screen.getByLabelText('Course'), {
      target: { value: '1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create subject' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Subject name cannot be empty or contain only spaces.',
    )
    expect(createSubject).not.toHaveBeenCalled()
  })

  it('rejects subject names longer than 50 characters with an alert', async () => {
    getSubjects.mockResolvedValue([])
    getCourses.mockResolvedValue(courses)

    renderSubjectsPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Add subject' }))
    fireEvent.change(screen.getByLabelText('Subject name'), {
      target: { value: 'a'.repeat(51) },
    })
    fireEvent.change(screen.getByLabelText('Course'), {
      target: { value: '1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create subject' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Subject name must be 50 characters or fewer.',
    )
    expect(createSubject).not.toHaveBeenCalled()
  })

  it('truncates long subject names in the list and keeps the full name available', async () => {
    const longSubjectName = 'Introduction to Cybersecurity and Network Defence'
    getSubjects.mockResolvedValue([
      { ...subjects[0], subject_name: longSubjectName },
    ])
    getCourses.mockResolvedValue(courses)

    renderSubjectsPage()

    const subjectName = await screen.findByText(longSubjectName)
    expect(subjectName.className).toContain('truncate')
    expect(subjectName.getAttribute('title')).toBe(longSubjectName)
  })

  it('does not offer a delete action for subjects', async () => {
    getSubjects.mockResolvedValue(subjects)
    getCourses.mockResolvedValue(courses)

    renderSubjectsPage()

    expect(await screen.findByText('Software Testing')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Delete Software Testing' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete Algorithms' })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

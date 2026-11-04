import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SubjectsPage } from '@/pages/subjects'

const { getSubjects, getCourses, updateSubject } = vi.hoisted(() => ({
  getSubjects: vi.fn(),
  getCourses: vi.fn(),
  updateSubject: vi.fn(),
}))

vi.mock('@/pages/subjects/api', () => ({
  getSubjects,
  getCourses,
  createSubject: vi.fn(),
  updateSubject,
  deleteSubject: vi.fn(),
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
})

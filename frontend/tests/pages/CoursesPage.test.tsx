import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CoursesPage } from '@/pages/courses'

const { getCourses, createCourse, updateCourse } = vi.hoisted(() => ({
  getCourses: vi.fn(),
  createCourse: vi.fn(),
  updateCourse: vi.fn(),
}))

vi.mock('@/pages/subjects/api', () => ({
  getCourses,
  createCourse,
  updateCourse,
  CourseApiError: class CourseApiError extends Error {},
}))

const courses = [
  { course_id: 1, course_title: 'BSc Software Engineering' },
  { course_id: 2, course_title: 'BSc Computer Science' },
]

describe('CoursesPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('creates a course and refreshes the list', async () => {
    const newCourse = {
      course_id: 3,
      course_title: 'BSc Mathematics',
    }
    getCourses
      .mockResolvedValueOnce(courses)
      .mockResolvedValueOnce([...courses, newCourse])
    createCourse.mockResolvedValue(newCourse)

    render(<CoursesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Add course' }))
    fireEvent.change(screen.getByLabelText('Course title'), {
      target: { value: 'BSc Mathematics' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create course' }))

    await waitFor(() => {
      expect(createCourse).toHaveBeenCalledWith({
        course_title: 'BSc Mathematics',
      })
      expect(getCourses).toHaveBeenCalledTimes(2)
    })
    expect(await screen.findByText('Course created successfully.')).toBeDefined()
    expect(await screen.findByText('BSc Mathematics')).toBeDefined()
  })

  it('rejects a whitespace-only course title without calling the API', async () => {
    getCourses.mockResolvedValue([])

    render(<CoursesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Add course' }))
    fireEvent.change(screen.getByLabelText('Course title'), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create course' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Enter a course title.',
    )
    expect(createCourse).not.toHaveBeenCalled()
  })

  it('edits a course and displays duplicate-title errors', async () => {
    getCourses.mockResolvedValue(courses)
    updateCourse.mockRejectedValue(
      new Error('A course with this title already exists.'),
    )

    render(<CoursesPage />)
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Edit BSc Software Engineering',
      }),
    )
    fireEvent.change(screen.getByLabelText('Course title'), {
      target: { value: 'BSc Computer Science' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateCourse).toHaveBeenCalledWith(1, {
        course_title: 'BSc Computer Science',
      })
    })
    expect((await screen.findByRole('alert')).textContent).toContain(
      'A course with this title already exists.',
    )
  })
})

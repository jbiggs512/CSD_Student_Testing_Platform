import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QuestionPoolPage } from '@/pages/questionPool'

const {
  getSubjects,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} = vi.hoisted(() => ({
  getSubjects: vi.fn(),
  getQuestions: vi.fn(),
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
}))

vi.mock('@/pages/questionPool/api', () => ({
  getSubjects,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  QuestionPoolApiError: class QuestionPoolApiError extends Error {},
}))

const mockSubjects = [
  {
    subject_id: 1,
    subject_name: 'Object Oriented Programming',
    course_id: 1,
    course_title: 'BSc Software Engineering',
    status: 'active' as const,
  },
  {
    subject_id: 2,
    subject_name: 'Software Testing',
    course_id: 1,
    course_title: 'BSc Software Engineering',
    status: 'active' as const,
  },
]

const mockQuestions = [
  {
    question_id: 1,
    subject_id: 1,
    test_id: null,
    question_text: 'What is encapsulation in OOP?',
    options: [
      { option_id: 1, option_text: 'Bundling data and methods', is_correct: true },
      { option_id: 2, option_text: 'Multiple inheritance', is_correct: false },
      { option_id: 3, option_text: 'Static compilation', is_correct: false },
      { option_id: 4, option_text: 'Manual memory management', is_correct: false },
    ],
  },
  {
    question_id: 2,
    subject_id: 1,
    test_id: null,
    question_text: 'What does LSP stand for?',
    options: [
      { option_id: 5, option_text: 'Linear System Process', is_correct: false },
      { option_id: 6, option_text: 'Liskov Substitution Principle', is_correct: true },
      { option_id: 7, option_text: 'Local Scope Pointer', is_correct: false },
      { option_id: 8, option_text: 'Logical Subclass Pattern', is_correct: false },
    ],
  },
]

function renderQuestionPoolPage() {
  return render(
    <MemoryRouter>
      <QuestionPoolPage />
    </MemoryRouter>,
  )
}

describe('QuestionPoolPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads subjects and displays questions for the selected subject', async () => {
    getSubjects.mockResolvedValue(mockSubjects)
    getQuestions.mockResolvedValue(mockQuestions)

    renderQuestionPoolPage()

    expect(await screen.findByText('What is encapsulation in OOP?')).toBeDefined()
    expect(screen.getByText('OOP-001')).toBeDefined()
    expect(screen.getByText('OOP-002')).toBeDefined()
    expect(screen.getByText('2 questions in this subject pool')).toBeDefined()
    expect(getQuestions).toHaveBeenCalledWith(1)
  })

  it('fetches questions for a newly selected subject', async () => {
    getSubjects.mockResolvedValue(mockSubjects)
    getQuestions.mockResolvedValue(mockQuestions)

    renderQuestionPoolPage()
    await screen.findByText('What is encapsulation in OOP?')

    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: '2' },
    })

    await waitFor(() => {
      expect(getQuestions).toHaveBeenCalledWith(2)
    })
  })

  it('opens the Add Question modal and creates a multiple-choice question with a correct answer', async () => {
    getSubjects.mockResolvedValue(mockSubjects)
    getQuestions.mockResolvedValue(mockQuestions)
    createQuestion.mockResolvedValue({
      question_id: 3,
      subject_id: 1,
      question_text: 'Which keyword defines a class in Python?',
      options: [
        { option_id: 9, option_text: 'def', is_correct: false },
        { option_id: 10, option_text: 'class', is_correct: true },
        { option_id: 11, option_text: 'struct', is_correct: false },
        { option_id: 12, option_text: 'object', is_correct: false },
      ],
    })

    renderQuestionPoolPage()
    await screen.findByText('What is encapsulation in OOP?')

    fireEvent.click(screen.getByRole('button', { name: 'Add Question' }))

    fireEvent.change(screen.getByLabelText('Question'), {
      target: { value: 'Which keyword defines a class in Python?' },
    })
    fireEvent.change(screen.getByLabelText('Option 1'), {
      target: { value: 'def' },
    })
    fireEvent.change(screen.getByLabelText('Option 2'), {
      target: { value: 'class' },
    })
    fireEvent.change(screen.getByLabelText('Option 3'), {
      target: { value: 'struct' },
    })
    fireEvent.change(screen.getByLabelText('Option 4'), {
      target: { value: 'object' },
    })
    fireEvent.click(screen.getByLabelText('Mark Option 2 as correct'))

    fireEvent.click(screen.getByRole('button', { name: 'Create question' }))

    await waitFor(() => {
      expect(createQuestion).toHaveBeenCalledWith({
        subject_id: 1,
        question_text: 'Which keyword defines a class in Python?',
        options: [
          { option_text: 'def', is_correct: false },
          { option_text: 'class', is_correct: true },
          { option_text: 'struct', is_correct: false },
          { option_text: 'object', is_correct: false },
        ],
      })
    })
  })

  it('opens the Edit Question modal and updates an existing question', async () => {
    getSubjects.mockResolvedValue(mockSubjects)
    getQuestions.mockResolvedValue(mockQuestions)
    updateQuestion.mockResolvedValue(mockQuestions[0])

    renderQuestionPoolPage()
    await screen.findByText('What is encapsulation in OOP?')

    fireEvent.click(screen.getByRole('button', { name: 'Edit OOP-001' }))

    const questionInput = screen.getByLabelText('Question') as HTMLInputElement
    expect(questionInput.value).toBe('What is encapsulation in OOP?')

    fireEvent.change(questionInput, {
      target: { value: 'Updated OOP question?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateQuestion).toHaveBeenCalledWith(1, {
        subject_id: 1,
        question_text: 'Updated OOP question?',
        options: [
          { option_text: 'Bundling data and methods', is_correct: true },
          { option_text: 'Multiple inheritance', is_correct: false },
          { option_text: 'Static compilation', is_correct: false },
          { option_text: 'Manual memory management', is_correct: false },
        ],
      })
    })
  })

  it('filters questions by search term', async () => {
    getSubjects.mockResolvedValue(mockSubjects)
    getQuestions.mockResolvedValue(mockQuestions)

    renderQuestionPoolPage()
    await screen.findByText('What is encapsulation in OOP?')

    fireEvent.change(screen.getByPlaceholderText('Search questions...'), {
      target: { value: 'LSP' },
    })

    expect(screen.queryByText('What is encapsulation in OOP?')).toBeNull()
    expect(screen.getByText('What does LSP stand for?')).toBeDefined()

    fireEvent.change(screen.getByPlaceholderText('Search questions...'), {
      target: { value: 'nonexistent-query' },
    })
    expect(screen.getByText('No matching questions')).toBeDefined()
  })

  it('confirms question deletion before calling deleteQuestion', async () => {
    getSubjects.mockResolvedValue(mockSubjects)
    getQuestions.mockResolvedValue(mockQuestions)
    deleteQuestion.mockResolvedValue(undefined)

    renderQuestionPoolPage()
    await screen.findByText('What is encapsulation in OOP?')

    fireEvent.click(screen.getByRole('button', { name: 'Delete OOP-001' }))

    expect(
      screen.getByText(
        'Delete "What is encapsulation in OOP?"? This action cannot be undone.',
      ),
    ).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /^Delete$/ }))

    await waitFor(() => {
      expect(deleteQuestion).toHaveBeenCalledWith(1)
    })
  })
})

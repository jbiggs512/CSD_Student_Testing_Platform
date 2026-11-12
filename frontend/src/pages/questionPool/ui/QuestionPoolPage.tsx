import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  HelpCircleIcon,
  LoaderCircleIcon,
} from 'lucide-react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@shared/components'
import type {
  Question,
  QuestionCreateRequest,
  QuestionOptionInput,
  QuestionUpdateRequest,
  Subject,
} from '../model'
import {
  createQuestion,
  deleteQuestion,
  getQuestions,
  getSubjects,
  QuestionPoolApiError,
  updateQuestion,
} from '../api'

const QUESTIONS_PER_PAGE = 5

interface QuestionFormValues {
  question_text: string
  options: [string, string, string, string]
  correctIndex: number
}

const EMPTY_FORM: QuestionFormValues = {
  question_text: '',
  options: ['', '', '', ''],
  correctIndex: 0,
}

function getSubjectPrefix(subjectName: string | undefined): string {
  if (!subjectName) return 'QUE'
  const words = subjectName
    .trim()
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
  if (words.length >= 3) {
    return words
      .slice(0, 3)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
  }
  const cleaned = subjectName.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return (cleaned.slice(0, 3) || 'QUE').padEnd(3, 'X')
}

function formatQuestionCode(
  question: Question,
  sequenceNumber: number,
  subjectName: string | undefined,
): string {
  if (question.question_code) {
    return question.question_code
  }
  const prefix = getSubjectPrefix(subjectName)
  return `${prefix}-${String(sequenceNumber).padStart(3, '0')}`
}

function getDisplayError(error: unknown): string {
  if (error instanceof QuestionPoolApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

export function QuestionPoolPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])

  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true)
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [pageError, setPageError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [questionPendingDelete, setQuestionPendingDelete] =
    useState<Question | null>(null)
  const [formValues, setFormValues] = useState<QuestionFormValues>(EMPTY_FORM)

  const loadSubjects = useCallback(async () => {
    setIsLoadingSubjects(true)
    setPageError(null)

    try {
      const subjectList = await getSubjects()
      const activeSubjects = subjectList.filter(
        (subject) => subject.status === 'active',
      )
      const available = activeSubjects.length > 0 ? activeSubjects : subjectList
      setSubjects(available)
      setSelectedSubjectId((current) => {
        if (
          current !== null &&
          available.some((subject) => subject.subject_id === current)
        ) {
          return current
        }
        return available[0]?.subject_id ?? null
      })
    } catch (error) {
      setPageError(getDisplayError(error))
    } finally {
      setIsLoadingSubjects(false)
    }
  }, [])

  const loadQuestions = useCallback(async (subjectId: number | null) => {
    if (subjectId === null) {
      setQuestions([])
      return
    }

    setIsLoadingQuestions(true)
    setPageError(null)

    try {
      const result = await getQuestions(subjectId)
      setQuestions(result)
    } catch (error) {
      setPageError(getDisplayError(error))
    } finally {
      setIsLoadingQuestions(false)
    }
  }, [])

  useEffect(() => {
    void loadSubjects()
  }, [loadSubjects])

  useEffect(() => {
    void loadQuestions(selectedSubjectId)
  }, [selectedSubjectId, loadQuestions])

  const openCreateModal = useCallback(() => {
    setEditingQuestion(null)
    setFormValues(EMPTY_FORM)
    setFormError(null)
    setIsModalOpen(true)
  }, [])

  const openEditModal = useCallback((question: Question) => {
    const paddedOptions: [string, string, string, string] = [
      question.options[0]?.option_text ?? '',
      question.options[1]?.option_text ?? '',
      question.options[2]?.option_text ?? '',
      question.options[3]?.option_text ?? '',
    ]
    const foundCorrectIndex = question.options.findIndex(
      (option) => option.is_correct,
    )

    setEditingQuestion(question)
    setFormValues({
      question_text: question.question_text,
      options: paddedOptions,
      correctIndex: foundCorrectIndex >= 0 ? foundCorrectIndex : 0,
    })
    setFormError(null)
    setIsModalOpen(true)
  }, [])

  const selectedSubject = useMemo(
    () =>
      subjects.find((subject) => subject.subject_id === selectedSubjectId) ??
      null,
    [subjects, selectedSubjectId],
  )

  const columns = useMemo<ColumnDef<Question>[]>(
    () => [
      {
        accessorKey: 'question_id',
        header: 'ID',
        meta: {
          headClassName: 'w-32',
          cellClassName: 'font-medium tabular-nums text-navy',
        },
        cell: ({ row }) =>
          formatQuestionCode(
            row.original,
            row.index + 1,
            selectedSubject?.subject_name,
          ),
      },
      {
        accessorKey: 'question_text',
        header: 'Question',
        cell: ({ row }) => {
          const question = row.original
          const correctOption = question.options.find((opt) => opt.is_correct)

          return (
            <div>
              <div className="font-medium text-navy">
                {question.question_text}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Correct answer:{' '}
                {correctOption ? correctOption.option_text : 'Not set'} &middot;{' '}
                {question.options.length} options
              </div>
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        meta: {
          headClassName: 'w-44 text-right',
        },
        cell: ({ row }) => {
          const question = row.original
          const code = formatQuestionCode(
            question,
            row.index + 1,
            selectedSubject?.subject_name,
          )

          return (
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => openEditModal(question)}
                aria-label={`Edit ${code}`}
                className="cursor-pointer text-xs font-medium text-navy hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setQuestionPendingDelete(question)}
                aria-label={`Delete ${code}`}
                className="cursor-pointer text-xs font-medium text-pink hover:underline"
              >
                Delete
              </button>
            </div>
          )
        },
      },
    ],
    [openEditModal, selectedSubject?.subject_name],
  )

  function closeModal(open: boolean) {
    setIsModalOpen(open)
    if (!open) {
      setEditingQuestion(null)
      setFormValues(EMPTY_FORM)
      setFormError(null)
    }
  }

  function handleOptionTextChange(index: number, value: string) {
    setFormValues((current) => {
      const nextOptions = [...current.options] as [
        string,
        string,
        string,
        string,
      ]
      nextOptions[index] = value
      return {
        ...current,
        options: nextOptions,
      }
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    if (selectedSubjectId === null) {
      setFormError('Please select a subject first.')
      return
    }

    const questionText = formValues.question_text.trim()
    if (!questionText) {
      setFormError('Enter a question.')
      return
    }

    const trimmedOptions = formValues.options.map((opt) => opt.trim())
    if (trimmedOptions.some((opt) => opt.length === 0)) {
      setFormError('All four answer options are required.')
      return
    }

    const optionsPayload: QuestionOptionInput[] = trimmedOptions.map(
      (optionText, index) => ({
        option_text: optionText,
        is_correct: index === formValues.correctIndex,
      }),
    )

    setIsSaving(true)

    try {
      if (editingQuestion) {
        const updatePayload: QuestionUpdateRequest = {
          subject_id: selectedSubjectId,
          question_text: questionText,
          options: optionsPayload,
        }
        await updateQuestion(editingQuestion.question_id, updatePayload)
        setSuccessMessage('Question updated successfully.')
      } else {
        const createPayload: QuestionCreateRequest = {
          subject_id: selectedSubjectId,
          question_text: questionText,
          options: optionsPayload,
        }
        await createQuestion(createPayload)
        setSuccessMessage('Question created successfully.')
      }

      setIsModalOpen(false)
      setEditingQuestion(null)
      setFormValues(EMPTY_FORM)
      await loadQuestions(selectedSubjectId)
    } catch (error) {
      setFormError(getDisplayError(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function confirmDelete() {
    if (!questionPendingDelete) return

    setPageError(null)
    setSuccessMessage(null)

    try {
      await deleteQuestion(questionPendingDelete.question_id)
      setSuccessMessage('Question deleted successfully.')
      setQuestionPendingDelete(null)
      await loadQuestions(selectedSubjectId)
    } catch (error) {
      setPageError(getDisplayError(error))
    }
  }

  const isLoading = isLoadingSubjects || isLoadingQuestions

  return (
    <main className="flex min-h-screen w-full flex-col gap-6 bg-[#f7f8fb] p-4 sm:p-6">
      <section className="flex flex-col justify-center rounded-2xl bg-navy p-8 text-white shadow-md sm:p-12">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Question Pool Management
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
          Organise questions by subject. Add new questions or keep your existing
          pool up to date.
        </p>
      </section>

      {pageError && (
        <Alert variant="destructive">
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <CheckCircle2Icon aria-hidden="true" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card className="border-0 py-5 shadow-sm">
        <CardContent className="px-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="subject-select"
              className="text-xs font-semibold text-navy"
            >
              Subject
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                id="subject-select"
                aria-label="Subject"
                value={selectedSubjectId ?? ''}
                disabled={isLoadingSubjects || subjects.length === 0}
                onChange={(event) =>
                  setSelectedSubjectId(Number(event.target.value))
                }
                className="h-10 w-full rounded-md border border-navy/40 bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs"
              >
                {subjects.length === 0 ? (
                  <option value="">No subjects available</option>
                ) : (
                  subjects.map((subject) => (
                    <option
                      key={subject.subject_id}
                      value={subject.subject_id}
                    >
                      {subject.subject_name}
                    </option>
                  ))
                )}
              </select>
              <p className="text-sm text-muted-foreground">
                Choose a subject to view and manage its question pool.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 border-0 py-0 shadow-sm">
        <CardHeader className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-heading text-2xl font-bold text-navy">
              Subject questions
            </CardTitle>
            <CardDescription>
              {questions.length}{' '}
              {questions.length === 1 ? 'question' : 'questions'} in this
              subject pool
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={openCreateModal}
            disabled={selectedSubjectId === null}
            className="w-full sm:w-auto"
          >
            Add Question
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
              <LoaderCircleIcon
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              Loading questions...
            </div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="rounded-full bg-muted p-3">
                <HelpCircleIcon
                  className="size-6 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <div className="space-y-1">
                <h2 className="font-medium text-navy">
                  No questions in this subject pool
                </h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {selectedSubjectId === null
                    ? 'Select a subject to manage its multiple-choice questions.'
                    : 'Add the first multiple-choice question to start building this subject pool.'}
                </p>
              </div>
              {selectedSubjectId !== null && (
                <Button type="button" onClick={openCreateModal}>
                  Add your first question
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={questions}
              pageSize={QUESTIONS_PER_PAGE}
              itemLabel="questions"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-navy">
              {editingQuestion ? 'Edit Question' : 'Add Question'}
            </DialogTitle>
            <DialogDescription>
              {editingQuestion
                ? 'Update the multiple-choice question, its answer options, or the correct answer.'
                : 'Enter the question and four multiple-choice options, then select the correct answer.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
            {formError && (
              <Alert variant="destructive">
                <AlertCircleIcon aria-hidden="true" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="question-text"
                className="text-xs font-semibold text-navy"
              >
                Question
              </label>
              <Input
                id="question-text"
                name="question_text"
                autoFocus
                required
                placeholder="Enter the question prompt..."
                value={formValues.question_text}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    question_text: event.target.value,
                  }))
                }
              />
            </div>

            <fieldset className="space-y-2.5">
              <legend className="text-xs font-semibold text-navy">
                Multiple-choice options (select the correct answer)
              </legend>
              {formValues.options.map((optionText, index) => {
                const optionNumber = index + 1
                const isCorrect = formValues.correctIndex === index

                return (
                  <div
                    key={optionNumber}
                    className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors ${
                      isCorrect
                        ? 'border-emerald-600/40 bg-emerald-50/40'
                        : 'border-border bg-background'
                    }`}
                  >
                    <input
                      type="radio"
                      id={`correct-option-${optionNumber}`}
                      name="correct_option"
                      checked={isCorrect}
                      onChange={() =>
                        setFormValues((current) => ({
                          ...current,
                          correctIndex: index,
                        }))
                      }
                      aria-label={`Mark Option ${optionNumber} as correct`}
                      className="size-4 cursor-pointer accent-pink"
                    />
                    <div className="flex-1">
                      <Input
                        id={`option-text-${optionNumber}`}
                        aria-label={`Option ${optionNumber}`}
                        required
                        placeholder={`Option ${optionNumber}`}
                        value={optionText}
                        onChange={(event) =>
                          handleOptionTextChange(index, event.target.value)
                        }
                      />
                    </div>
                    <label
                      htmlFor={`correct-option-${optionNumber}`}
                      className={`cursor-pointer text-xs font-medium ${
                        isCorrect ? 'text-emerald-700' : 'text-muted-foreground'
                      }`}
                    >
                      {isCorrect ? 'Correct' : 'Select'}
                    </label>
                  </div>
                )
              })}
            </fieldset>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => closeModal(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && (
                  <LoaderCircleIcon
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                {isSaving
                  ? 'Saving...'
                  : editingQuestion
                    ? 'Save changes'
                    : 'Create question'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={questionPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setQuestionPendingDelete(null)
        }}
        title="Delete question?"
        description={
          questionPendingDelete
            ? `Delete "${questionPendingDelete.question_text}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}

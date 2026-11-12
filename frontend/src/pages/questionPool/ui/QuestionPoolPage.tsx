import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  Edit2Icon,
  HelpCircleIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
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
  QuestionBulkItemInput,
  QuestionCreateRequest,
  QuestionOptionInput,
  QuestionUpdateRequest,
  Subject,
} from '../model'
import {
  bulkCreateQuestions,
  createQuestion,
  deleteQuestion,
  getQuestions,
  getSubjects,
  QuestionPoolApiError,
  updateQuestion,
} from '../api'

const QUESTIONS_PER_PAGE = 5

const SAMPLE_BULK_JSON = JSON.stringify(
  [
    {
      question_text: 'Which HTTP method is idempotent and used to replace a resource?',
      options: [
        { option_text: 'POST', is_correct: false },
        { option_text: 'PUT', is_correct: true },
        { option_text: 'PATCH', is_correct: false },
        { option_text: 'CONNECT', is_correct: false },
      ],
    },
  ],
  null,
  2,
)

function sanitizeInputText(value: string): string {
  return value
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(
      /<\/?(?:iframe|object|embed|style|svg|math|link|meta|base)\b[^>]*>/gi,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function downloadJsonFile(filename: string, data: unknown): void {
  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function parseBulkQuestionsJson(
  rawJson: string,
  existingQuestions: Question[] = [],
): {
  items: QuestionBulkItemInput[] | null
  error: string | null
} {
  const trimmed = rawJson.trim()
  if (!trimmed) {
    return { items: null, error: 'Upload a JSON file or paste JSON content.' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { items: null, error: 'Invalid JSON syntax.' }
  }

  const rawItems = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' &&
        parsed !== null &&
        Array.isArray((parsed as { questions?: unknown }).questions)
      ? (parsed as { questions: unknown[] }).questions
      : null

  if (!rawItems) {
    return {
      items: null,
      error:
        'JSON must be an array of questions or an object with a "questions" array.',
    }
  }

  if (rawItems.length === 0) {
    return { items: null, error: 'At least one question is required.' }
  }

  const existingKeys = new Set(
    existingQuestions.map((q) => sanitizeInputText(q.question_text).toLowerCase()),
  )
  const seenInBatch = new Set<string>()
  const normalized: QuestionBulkItemInput[] = []

  for (let i = 0; i < rawItems.length; i += 1) {
    const label = `Question ${i + 1}`
    const entry = rawItems[i]
    if (typeof entry !== 'object' || entry === null) {
      return { items: null, error: `${label}: must be an object.` }
    }

    const questionText = (entry as { question_text?: unknown }).question_text
    const cleanedQuestionText =
      typeof questionText === 'string' ? sanitizeInputText(questionText) : ''
    if (!cleanedQuestionText) {
      return {
        items: null,
        error: `${label}: "question_text" must be a non-empty string.`,
      }
    }

    const normalizedKey = cleanedQuestionText.toLowerCase()
    if (seenInBatch.has(normalizedKey)) {
      return {
        items: null,
        error: `${label}: Duplicate question in upload.`,
      }
    }
    if (existingKeys.has(normalizedKey)) {
      return {
        items: null,
        error: `${label}: Question already exists in this subject.`,
      }
    }
    seenInBatch.add(normalizedKey)

    const options = (entry as { options?: unknown }).options
    if (!Array.isArray(options) || options.length !== 4) {
      return {
        items: null,
        error: `${label}: "options" must be an array of exactly 4 items.`,
      }
    }

    const normalizedOptions: QuestionOptionInput[] = []
    let correctCount = 0

    for (let j = 0; j < options.length; j += 1) {
      const opt = options[j]
      if (typeof opt !== 'object' || opt === null) {
        return {
          items: null,
          error: `${label}, Option ${j + 1}: must be an object.`,
        }
      }

      const optionText = (opt as { option_text?: unknown }).option_text
      const isCorrect = (opt as { is_correct?: unknown }).is_correct

      const cleanedOptionText =
        typeof optionText === 'string' ? sanitizeInputText(optionText) : ''
      if (!cleanedOptionText) {
        return {
          items: null,
          error: `${label}, Option ${j + 1}: "option_text" is required.`,
        }
      }
      if (typeof isCorrect !== 'boolean') {
        return {
          items: null,
          error: `${label}, Option ${j + 1}: "is_correct" must be a boolean.`,
        }
      }

      if (isCorrect) correctCount += 1
      normalizedOptions.push({
        option_text: cleanedOptionText,
        is_correct: isCorrect,
      })
    }

    if (correctCount !== 1) {
      return {
        items: null,
        error: `${label}: exactly one option must have "is_correct": true.`,
      }
    }

    normalized.push({
      question_text: cleanedQuestionText,
      options: normalizedOptions,
    })
  }

  return { items: normalized, error: null }
}

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
  subjectName: string | undefined,
): string {
  if (question.question_code) {
    return question.question_code
  }
  const prefix = getSubjectPrefix(subjectName)
  return `${prefix}-${String(question.question_id).padStart(3, '0')}`
}

function getDisplayError(error: unknown): string {
  if (error instanceof QuestionPoolApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

interface QuestionRowItem {
  question: Question
  code: string
}

export function QuestionPoolPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [searchTerm, setSearchTerm] = useState('')

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

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [bulkJsonText, setBulkJsonText] = useState('')
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [isBulkSaving, setIsBulkSaving] = useState(false)

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

  const codedQuestions = useMemo<QuestionRowItem[]>(
    () =>
      questions.map((question) => ({
        question,
        code: formatQuestionCode(question, selectedSubject?.subject_name),
      })),
    [questions, selectedSubject?.subject_name],
  )

  const filteredQuestions = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase()
    if (!search) return codedQuestions

    return codedQuestions.filter(({ question, code }) => {
      const optionTexts = question.options
        .map((opt) => opt.option_text)
        .join(' ')
      return [code, question.question_text, optionTexts]
        .join(' ')
        .toLocaleLowerCase()
        .includes(search)
    })
  }, [codedQuestions, searchTerm])

  const columns = useMemo<ColumnDef<QuestionRowItem>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'ID',
        meta: {
          headClassName: 'w-32',
          cellClassName: 'font-medium tabular-nums text-foreground',
        },
      },
      {
        id: 'question_text',
        header: 'Question',
        cell: ({ row }) => {
          const { question } = row.original
          const correctOption = question.options.find((opt) => opt.is_correct)

          return (
            <div>
              <div className="font-medium text-foreground">
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
          const { question, code } = row.original

          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => openEditModal(question)}
                aria-label={`Edit ${code}`}
              >
                <Edit2Icon aria-hidden="true" />
                <span className="hidden lg:inline">Edit</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setQuestionPendingDelete(question)}
                aria-label={`Delete ${code}`}
                className="text-destructive hover:text-destructive"
              >
                <Trash2Icon aria-hidden="true" />
              </Button>
            </div>
          )
        },
      },
    ],
    [openEditModal],
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

    const questionText = sanitizeInputText(formValues.question_text)
    if (!questionText) {
      setFormError('Enter a question.')
      return
    }

    const isDuplicate = questions.some(
      (q) =>
        q.question_id !== editingQuestion?.question_id &&
        sanitizeInputText(q.question_text).toLowerCase() ===
          questionText.toLowerCase(),
    )
    if (isDuplicate) {
      setFormError('Question already exists in this subject.')
      return
    }

    const trimmedOptions = formValues.options.map((opt) => sanitizeInputText(opt))
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

  const openBulkModal = useCallback(() => {
    setBulkJsonText('')
    setBulkError(null)
    setIsBulkModalOpen(true)
  }, [])

  function closeBulkModal(open: boolean) {
    setIsBulkModalOpen(open)
    if (!open) {
      setBulkJsonText('')
      setBulkError(null)
    }
  }

  async function handleBulkFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setBulkError(null)
    try {
      const text = await file.text()
      setBulkJsonText(text)
    } catch {
      setBulkError('Unable to read the selected JSON file.')
    }
  }

  function handleDownloadSample() {
    downloadJsonFile('question-pool-template.json', SAMPLE_BULK_JSON)
  }

  function handleDownloadPool() {
    if (questions.length === 0) return
    const prefix = getSubjectPrefix(selectedSubject?.subject_name).toLowerCase()
    const exportPayload = questions.map((q) => ({
      question_text: q.question_text,
      options: q.options.map((opt) => ({
        option_text: opt.option_text,
        is_correct: opt.is_correct,
      })),
    }))
    downloadJsonFile(`${prefix}-questions.json`, exportPayload)
  }

  async function handleBulkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBulkError(null)
    setSuccessMessage(null)

    if (selectedSubjectId === null) {
      setBulkError('Please select a subject first.')
      return
    }

    const { items, error } = parseBulkQuestionsJson(bulkJsonText, questions)
    if (error || !items) {
      setBulkError(error ?? 'Invalid JSON payload.')
      return
    }

    setIsBulkSaving(true)
    try {
      const response = await bulkCreateQuestions({
        subject_id: selectedSubjectId,
        questions: items,
      })
      setSuccessMessage(
        `Uploaded ${response.created_count} ${response.created_count === 1 ? 'question' : 'questions'} successfully.`,
      )
      setIsBulkModalOpen(false)
      setBulkJsonText('')
      await loadQuestions(selectedSubjectId)
    } catch (err) {
      setBulkError(getDisplayError(err))
    } finally {
      setIsBulkSaving(false)
    }
  }

  const bulkPreview = useMemo(() => {
    if (!bulkJsonText.trim()) return null
    return parseBulkQuestionsJson(bulkJsonText, questions)
  }, [bulkJsonText, questions])

  const isLoading = isLoadingSubjects || isLoadingQuestions
  const showEmptyState = !isLoading && filteredQuestions.length === 0
  const showQuestionTable = !isLoading && filteredQuestions.length > 0

  return (
    <main className="flex min-h-screen w-full flex-col gap-8 bg-[#f7f8fb] p-4">
      <section className="flex flex-col gap-6 rounded-2xl bg-navy p-10 text-white shadow-md sm:flex-row sm:items-end sm:justify-between sm:p-14">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
            Teaching and assessment
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Question Pool Management
          </h1>
          <p className="text-sm leading-6 text-white/80 sm:text-base">
            Organise questions by subject. Add new questions or keep your
            existing pool up to date.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={openBulkModal}
            disabled={selectedSubjectId === null}
            className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto"
          >
            <UploadIcon aria-hidden="true" />
            Bulk Upload JSON
          </Button>
          <Button
            type="button"
            onClick={openCreateModal}
            disabled={selectedSubjectId === null}
            className="w-full bg-white text-navy hover:bg-white/90 sm:w-auto"
          >
            <PlusIcon aria-hidden="true" />
            Add Question
          </Button>
        </div>
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
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs"
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

      <Card className="gap-0 border-0 py-0 shadow-md">
        <CardHeader className="gap-4 border-b py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-heading text-2xl font-bold text-plum">
              Subject questions
            </CardTitle>
            <CardDescription>
              {questions.length}{' '}
              {questions.length === 1 ? 'question' : 'questions'} in this
              subject pool
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadPool}
              disabled={questions.length === 0}
              className="w-full sm:w-auto"
            >
              <DownloadIcon aria-hidden="true" />
              Download JSON
            </Button>
            <div className="relative min-w-0 sm:w-72">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search questions"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
              <LoaderCircleIcon
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              Loading questions...
            </div>
          )}

          {showEmptyState && (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="rounded-full bg-muted p-3">
                <HelpCircleIcon
                  className="size-6 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <div className="space-y-1">
                <h2 className="font-medium">
                  {questions.length === 0
                    ? 'No questions in this subject pool'
                    : 'No matching questions'}
                </h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {questions.length === 0
                    ? 'Add the first multiple-choice question to start building this subject pool.'
                    : 'Try changing your search term.'}
                </p>
              </div>
              {questions.length === 0 && selectedSubjectId !== null && (
                <Button type="button" onClick={openCreateModal}>
                  Add your first question
                </Button>
              )}
            </div>
          )}

          {showQuestionTable && (
            <DataTable
              columns={columns}
              data={filteredQuestions}
              pageSize={QUESTIONS_PER_PAGE}
              itemLabel="questions"
              className="min-w-[900px]"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-plum">
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

      <Dialog open={isBulkModalOpen} onOpenChange={closeBulkModal}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-plum">
              Bulk Upload Questions (JSON)
            </DialogTitle>
            <DialogDescription>
              Upload a JSON file or paste a JSON array of multiple-choice
              questions for{' '}
              <span className="font-medium text-foreground">
                {selectedSubject?.subject_name ?? 'the selected subject'}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBulkSubmit} className="mt-2 flex flex-col gap-4">
            {bulkError && (
              <Alert variant="destructive">
                <AlertCircleIcon aria-hidden="true" />
                <AlertDescription>{bulkError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <label
                  htmlFor="bulk-json-file"
                  className="text-xs font-semibold text-navy"
                >
                  JSON file
                </label>
                <Input
                  id="bulk-json-file"
                  type="file"
                  accept=".json,application/json"
                  onChange={(event) => void handleBulkFileChange(event)}
                  className="cursor-pointer"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadSample}
                className="sm:mt-5"
              >
                <DownloadIcon aria-hidden="true" />
                Download template
              </Button>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="bulk-json-textarea"
                className="text-xs font-semibold text-navy"
              >
                JSON content
              </label>
              <textarea
                id="bulk-json-textarea"
                rows={8}
                placeholder={SAMPLE_BULK_JSON}
                value={bulkJsonText}
                onChange={(event) => {
                  setBulkJsonText(event.target.value)
                  setBulkError(null)
                }}
                className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {bulkPreview?.items && (
                <p className="text-xs font-medium text-emerald-700">
                  Ready to upload {bulkPreview.items.length}{' '}
                  {bulkPreview.items.length === 1 ? 'question' : 'questions'}.
                </p>
              )}
              {bulkPreview?.error && !bulkError && (
                <p className="text-xs text-muted-foreground">
                  {bulkPreview.error}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => closeBulkModal(false)}
                disabled={isBulkSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isBulkSaving}>
                {isBulkSaving && (
                  <LoaderCircleIcon
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                {isBulkSaving ? 'Uploading...' : 'Upload questions'}
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

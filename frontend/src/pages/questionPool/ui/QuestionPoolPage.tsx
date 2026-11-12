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
  Input,
} from '@shared/components'
import {
  downloadJsonFile,
  getErrorMessage,
  sanitizeInputText,
} from '@shared/lib/utils'
import {
  EMPTY_FORM,
  SAMPLE_BULK_JSON,
  formatQuestionCode,
  getSubjectPrefix,
  parseBulkQuestionsJson,
} from '../model'
import type {
  Question,
  QuestionFormValues,
  QuestionOptionInput,
  QuestionRowItem,
  Subject,
} from '../model'
import {
  bulkCreateQuestions,
  createQuestion,
  deleteQuestion,
  getQuestions,
  getSubjects,
  updateQuestion,
} from '../api'
import { QuestionFormDialog } from './QuestionFormDialog'
import { BulkUploadQuestionsDialog } from './BulkUploadQuestionsDialog'

const QUESTIONS_PER_PAGE = 5

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
      setPageError(getErrorMessage(error))
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
      setQuestions(await getQuestions(subjectId))
    } catch (error) {
      setPageError(getErrorMessage(error))
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
    const foundCorrectIndex = question.options.findIndex((opt) => opt.is_correct)
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
      const optionTexts = question.options.map((opt) => opt.option_text).join(' ')
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
        meta: { headClassName: 'w-44 text-right' },
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
      const nextOptions = [...current.options] as [string, string, string, string]
      nextOptions[index] = value
      return { ...current, options: nextOptions }
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

    const payload = {
      subject_id: selectedSubjectId,
      question_text: questionText,
      options: optionsPayload,
    }

    setIsSaving(true)
    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.question_id, payload)
        setSuccessMessage('Question updated successfully.')
      } else {
        await createQuestion(payload)
        setSuccessMessage('Question created successfully.')
      }
      closeModal(false)
      await loadQuestions(selectedSubjectId)
    } catch (error) {
      setFormError(getErrorMessage(error))
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
      setPageError(getErrorMessage(error))
    }
  }

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
      setBulkJsonText(await file.text())
    } catch {
      setBulkError('Unable to read the selected JSON file.')
    }
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
      closeBulkModal(false)
      await loadQuestions(selectedSubjectId)
    } catch (err) {
      setBulkError(getErrorMessage(err))
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
            onClick={() => closeBulkModal(true)}
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
                    <option key={subject.subject_id} value={subject.subject_id}>
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

      <QuestionFormDialog
        open={isModalOpen}
        isEditing={editingQuestion !== null}
        isSaving={isSaving}
        formError={formError}
        formValues={formValues}
        onOpenChange={closeModal}
        onSubmit={handleSubmit}
        onQuestionTextChange={(value) =>
          setFormValues((current) => ({ ...current, question_text: value }))
        }
        onOptionTextChange={handleOptionTextChange}
        onCorrectIndexChange={(index) =>
          setFormValues((current) => ({ ...current, correctIndex: index }))
        }
      />

      <BulkUploadQuestionsDialog
        open={isBulkModalOpen}
        subjectName={selectedSubject?.subject_name}
        bulkJsonText={bulkJsonText}
        bulkError={bulkError}
        isBulkSaving={isBulkSaving}
        bulkPreview={bulkPreview}
        onOpenChange={closeBulkModal}
        onSubmit={handleBulkSubmit}
        onFileChange={(event) => void handleBulkFileChange(event)}
        onJsonTextChange={(value) => {
          setBulkJsonText(value)
          setBulkError(null)
        }}
        onDownloadSample={() =>
          downloadJsonFile('question-pool-template.json', SAMPLE_BULK_JSON)
        }
      />

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

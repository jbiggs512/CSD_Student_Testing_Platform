import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  downloadJsonFile,
  getErrorMessage,
  sanitizeInputText,
} from '@shared/lib/utils'
import {
  bulkCreateQuestions,
  createQuestion,
  deleteQuestion,
  getQuestions,
  getSubjects,
  updateQuestion,
} from '../api'
import {
  EMPTY_FORM,
  SAMPLE_BULK_JSON,
  formatQuestionCode,
  getSubjectPrefix,
  parseBulkQuestionsJson,
} from './questionHelpers'
import type { QuestionFormValues, QuestionRowItem } from './questionHelpers'
import type { Question, QuestionOptionInput, Subject } from './types'

export function useQuestionPool() {
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

  const bulkPreview = useMemo(() => {
    if (!bulkJsonText.trim()) return null
    return parseBulkQuestionsJson(bulkJsonText, questions)
  }, [bulkJsonText, questions])

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
      correctIndex: Math.max(0, foundCorrectIndex),
    })
    setFormError(null)
    setIsModalOpen(true)
  }, [])

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

  function handleDownloadSample() {
    downloadJsonFile('question-pool-template.json', SAMPLE_BULK_JSON)
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

  return {
    subjects,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedSubject,
    questions,
    filteredQuestions,
    searchTerm,
    setSearchTerm,
    isLoading: isLoadingSubjects || isLoadingQuestions,
    isLoadingSubjects,
    isSaving,
    pageError,
    formError,
    successMessage,
    isModalOpen,
    editingQuestion,
    questionPendingDelete,
    setQuestionPendingDelete,
    formValues,
    setFormValues,
    isBulkModalOpen,
    bulkJsonText,
    setBulkJsonText,
    bulkError,
    setBulkError,
    isBulkSaving,
    bulkPreview,
    openCreateModal,
    openEditModal,
    closeModal,
    handleOptionTextChange,
    handleSubmit,
    confirmDelete,
    closeBulkModal,
    handleBulkFileChange,
    handleDownloadPool,
    handleDownloadSample,
    handleBulkSubmit,
  }
}

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertCircleIcon, CheckCircle2Icon } from 'lucide-react'
import { Alert, AlertDescription, ConfirmDialog } from '@shared/components'
import { getErrorMessage, sanitizeInputText } from '@shared/lib/utils'
import {
  createTest,
  deleteTest,
  getSubjects,
  getTestManagementStats,
  getTestResults,
  getTests,
} from '../api'
import { MIN_QUESTIONS_PER_ATTEMPT } from '../model'
import type {
  LecturerTest,
  Subject,
  TestManagementStats,
  TestResultsDetail,
} from '../model'
import { AllTestsCard } from './AllTestsCard'
import { CreateTestDialog } from './CreateTestDialog'
import type { CreateTestFormValues } from './CreateTestDialog'
import { TestManagementHero } from './TestManagementHero'
import { TestResultsDialog } from './TestResultsDialog'

const INITIAL_FORM: CreateTestFormValues = {
  testName: '',
  description: '',
  timeLimitMinutes: '',
  questionsPerAttempt: String(MIN_QUESTIONS_PER_ATTEMPT),
  subjectId: '',
}

function formatDeleteTestDescription(test: LecturerTest): string {
  const studentCount = test.attempted_student_count ?? test.attempt_count ?? 0
  const studentPhrase =
    studentCount === 1
      ? '1 student has attempted this test.'
      : `${studentCount} students have attempted this test.`
  const consequence =
    studentCount > 0
      ? 'Deleting it will permanently remove all attempt records for this test and cannot be undone.'
      : 'This action cannot be undone.'
  return `Delete "${test.test_name}"? ${studentPhrase} ${consequence}`
}

export function TestManagementPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [tests, setTests] = useState<LecturerTest[]>([])
  const [stats, setStats] = useState<TestManagementStats | null>(null)
  const [formValues, setFormValues] =
    useState<CreateTestFormValues>(INITIAL_FORM)
  const [isLoadingInitial, setIsLoadingInitial] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [pageSuccess, setPageSuccess] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [testPendingDelete, setTestPendingDelete] =
    useState<LecturerTest | null>(null)
  const [selectedTestForResults, setSelectedTestForResults] =
    useState<LecturerTest | null>(null)
  const [testResults, setTestResults] = useState<TestResultsDetail | null>(null)
  const [isLoadingResults, setIsLoadingResults] = useState(false)
  const [resultsError, setResultsError] = useState<string | null>(null)

  const loadDashboardData = useCallback(async () => {
    setIsLoadingInitial(true)
    setPageError(null)
    try {
      const [subjectList, testList, summaryStats] = await Promise.all([
        getSubjects(),
        getTests(),
        getTestManagementStats(),
      ])
      setSubjects(subjectList.filter((subject) => subject.status === 'active'))
      setTests(testList)
      setStats(summaryStats)
    } catch (error) {
      setPageError(getErrorMessage(error))
    } finally {
      setIsLoadingInitial(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboardData()
  }, [loadDashboardData])

  function handleFieldChange(
    field: keyof CreateTestFormValues,
    value: string,
  ) {
    setFormError(null)
    setFormValues((current) => ({ ...current, [field]: value }))
  }

  function handleOpenCreateDialog() {
    setFormError(null)
    setPageSuccess(null)
    setIsCreateDialogOpen(true)
  }

  function handleCreateDialogOpenChange(open: boolean) {
    setIsCreateDialogOpen(open)
    if (!open) {
      setFormError(null)
    }
  }

  async function handleViewResults(test: LecturerTest) {
    setSelectedTestForResults(test)
    setTestResults(null)
    setResultsError(null)
    setIsLoadingResults(true)
    try {
      const details = await getTestResults(test.test_id)
      setTestResults(details)
    } catch (error) {
      setResultsError(getErrorMessage(error))
    } finally {
      setIsLoadingResults(false)
    }
  }

  function handleResultsDialogOpenChange(open: boolean) {
    if (!open) {
      setSelectedTestForResults(null)
      setTestResults(null)
      setResultsError(null)
    }
  }

  async function handleConfirmDelete() {
    if (!testPendingDelete) return
    const target = testPendingDelete
    setTestPendingDelete(null)
    setPageError(null)
    setPageSuccess(null)
    try {
      await deleteTest(target.test_id)
      setPageSuccess(`Deleted test "${target.test_name}".`)
      const [updatedTests, updatedStats] = await Promise.all([
        getTests(),
        getTestManagementStats(),
      ])
      setTests(updatedTests)
      setStats(updatedStats)
    } catch (error) {
      setPageError(getErrorMessage(error))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setPageSuccess(null)

    const testName = sanitizeInputText(formValues.testName)
    if (!testName) {
      setFormError('Test name is required.')
      return
    }

    const subjectId = Number(formValues.subjectId)
    if (!subjectId) {
      setFormError('Please select a subject.')
      return
    }

    const questionsPerAttempt = Number(formValues.questionsPerAttempt)
    if (!Number.isInteger(questionsPerAttempt) || questionsPerAttempt < MIN_QUESTIONS_PER_ATTEMPT) {
      setFormError(`Questions per attempt must be at least ${MIN_QUESTIONS_PER_ATTEMPT}.`)
      return
    }

    const rawTimeLimit = formValues.timeLimitMinutes.trim()
    const timeLimitMinutes = rawTimeLimit ? Number(rawTimeLimit) : null
    if (
      timeLimitMinutes !== null &&
      (!Number.isInteger(timeLimitMinutes) || timeLimitMinutes < 1)
    ) {
      setFormError('Time limit must be a positive number of minutes.')
      return
    }

    const description = sanitizeInputText(formValues.description)

    setIsSaving(true)
    try {
      const created = await createTest({
        subject_id: subjectId,
        test_name: testName,
        description: description || null,
        time_limit_minutes: timeLimitMinutes,
        questions_per_attempt: questionsPerAttempt,
      })
      setFormValues(INITIAL_FORM)
      setIsCreateDialogOpen(false)
      setPageSuccess(`Created test "${created.test_name}".`)
      const [updatedTests, updatedStats] = await Promise.all([
        getTests(),
        getTestManagementStats(),
      ])
      setTests(updatedTests)
      setStats(updatedStats)
    } catch (error) {
      setFormError(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col gap-8 bg-[#f7f8fb] p-4">
      <TestManagementHero stats={stats} />

      {pageError && (
        <Alert variant="destructive">
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      {pageSuccess && (
        <Alert>
          <CheckCircle2Icon aria-hidden="true" />
          <AlertDescription>{pageSuccess}</AlertDescription>
        </Alert>
      )}

      <AllTestsCard
        tests={tests}
        isLoading={isLoadingInitial}
        onCreateTest={handleOpenCreateDialog}
        onViewResults={(test) => void handleViewResults(test)}
        onDeleteTest={setTestPendingDelete}
      />

      <CreateTestDialog
        open={isCreateDialogOpen}
        onOpenChange={handleCreateDialogOpenChange}
        subjects={subjects}
        formValues={formValues}
        isLoadingSubjects={isLoadingInitial}
        isSaving={isSaving}
        formError={formError}
        onFieldChange={handleFieldChange}
        onSubmit={(event) => void handleSubmit(event)}
      />

      <TestResultsDialog
        test={selectedTestForResults}
        results={testResults}
        isLoading={isLoadingResults}
        error={resultsError}
        onOpenChange={handleResultsDialogOpenChange}
      />

      <ConfirmDialog
        open={testPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTestPendingDelete(null)
        }}
        title="Are you sure you want to delete this test?"
        description={
          testPendingDelete
            ? formatDeleteTestDescription(testPendingDelete)
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => void handleConfirmDelete()}
      />
    </main>
  )
}

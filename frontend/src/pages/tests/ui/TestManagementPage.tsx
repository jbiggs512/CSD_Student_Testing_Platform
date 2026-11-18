import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertCircleIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@shared/components'
import { getErrorMessage, sanitizeInputText } from '@shared/lib/utils'
import {
  createTest,
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
import { CreateTestCard } from './CreateTestCard'
import type { CreateTestFormValues } from './CreateTestCard'
import { TestManagementHero } from './TestManagementHero'
import { TestResultsDialog } from './TestResultsDialog'

const INITIAL_FORM: CreateTestFormValues = {
  testName: '',
  description: '',
  timeLimitMinutes: '',
  questionsPerAttempt: String(MIN_QUESTIONS_PER_ATTEMPT),
  subjectId: '',
}

export function TestManagementPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [tests, setTests] = useState<LecturerTest[]>([])
  const [stats, setStats] = useState<TestManagementStats | null>(null)
  const [formValues, setFormValues] =
    useState<CreateTestFormValues>(INITIAL_FORM)
  const [isLoadingInitial, setIsLoadingInitial] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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
    setSuccessMessage(null)
    setFormValues((current) => ({ ...current, [field]: value }))
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

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
      setSuccessMessage(`Created test "${created.test_name}".`)
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

      <div className="grid gap-6 lg:grid-cols-2">
        <AllTestsCard
          tests={tests}
          isLoading={isLoadingInitial}
          onViewResults={(test) => void handleViewResults(test)}
        />
        <CreateTestCard
          subjects={subjects}
          formValues={formValues}
          isLoadingSubjects={isLoadingInitial}
          isSaving={isSaving}
          formError={formError}
          successMessage={successMessage}
          onFieldChange={handleFieldChange}
          onSubmit={(event) => void handleSubmit(event)}
        />
      </div>

      <TestResultsDialog
        test={selectedTestForResults}
        results={testResults}
        isLoading={isLoadingResults}
        error={resultsError}
        onOpenChange={handleResultsDialogOpenChange}
      />
    </main>
  )
}

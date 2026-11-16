import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertCircleIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@shared/components'
import { getErrorMessage, sanitizeInputText } from '@shared/lib/utils'
import { createTest, getSubjects } from '../api'
import type { LecturerTest, Subject } from '../model'
import { AllTestsCard } from './AllTestsCard'
import { CreateTestCard } from './CreateTestCard'
import type { CreateTestFormValues } from './CreateTestCard'
import { TestManagementHero } from './TestManagementHero'

const INITIAL_FORM: CreateTestFormValues = {
  testName: '',
  description: '',
  timeLimitMinutes: '',
  questionsPerAttempt: '10',
  subjectId: '',
}

export function TestManagementPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [createdTests, setCreatedTests] = useState<LecturerTest[]>([])
  const [formValues, setFormValues] =
    useState<CreateTestFormValues>(INITIAL_FORM)
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadSubjects = useCallback(async () => {
    setIsLoadingSubjects(true)
    setPageError(null)
    try {
      const subjectList = await getSubjects()
      const activeSubjects = subjectList.filter(
        (subject) => subject.status === 'active',
      )
      setSubjects(activeSubjects)
    } catch (error) {
      setPageError(getErrorMessage(error))
    } finally {
      setIsLoadingSubjects(false)
    }
  }, [])

  useEffect(() => {
    void loadSubjects()
  }, [loadSubjects])

  function handleFieldChange(
    field: keyof CreateTestFormValues,
    value: string,
  ) {
    setFormError(null)
    setSuccessMessage(null)
    setFormValues((current) => ({ ...current, [field]: value }))
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
    if (!Number.isInteger(questionsPerAttempt) || questionsPerAttempt < 1) {
      setFormError('Questions per attempt must be at least 1.')
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
      setCreatedTests((current) => [created, ...current])
      setFormValues(INITIAL_FORM)
      setSuccessMessage(`Created test "${created.test_name}".`)
    } catch (error) {
      setFormError(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col gap-8 bg-[#f7f8fb] p-4">
      <TestManagementHero />

      {pageError && (
        <Alert variant="destructive">
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <AllTestsCard tests={createdTests} />
        <CreateTestCard
          subjects={subjects}
          formValues={formValues}
          isLoadingSubjects={isLoadingSubjects}
          isSaving={isSaving}
          formError={formError}
          successMessage={successMessage}
          onFieldChange={handleFieldChange}
          onSubmit={(event) => void handleSubmit(event)}
        />
      </div>
    </main>
  )
}

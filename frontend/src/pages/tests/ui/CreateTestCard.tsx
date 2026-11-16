import type { FormEvent } from 'react'
import { AlertCircleIcon, CheckCircle2Icon, LoaderCircleIcon } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components'
import type { Subject } from '../model'

export interface CreateTestFormValues {
  testName: string
  description: string
  timeLimitMinutes: string
  questionsPerAttempt: string
  subjectId: string
}

interface CreateTestCardProps {
  subjects: readonly Subject[]
  formValues: CreateTestFormValues
  isLoadingSubjects: boolean
  isSaving: boolean
  formError: string | null
  successMessage: string | null
  onFieldChange: (field: keyof CreateTestFormValues, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function CreateTestCard({
  subjects,
  formValues,
  isLoadingSubjects,
  isSaving,
  formError,
  successMessage,
  onFieldChange,
  onSubmit,
}: Readonly<CreateTestCardProps>) {
  const selectedSubject = subjects.find(
    (subject) => String(subject.subject_id) === formValues.subjectId,
  )
  const selectedSubjectLabel = selectedSubject
    ? `${selectedSubject.subject_name} (${selectedSubject.course_title})`
    : undefined

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="px-6 pt-6 text-center">
        <CardTitle className="font-heading text-2xl font-bold text-navy">
          Create New Test
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <form
          onSubmit={onSubmit}
          noValidate
          className="mx-auto flex max-w-md flex-col gap-4 rounded-xl border border-border p-5"
        >
          {formError && (
            <Alert variant="destructive">
              <AlertCircleIcon aria-hidden="true" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert>
              <CheckCircle2Icon aria-hidden="true" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="test-name">Test Name</Label>
            <Input
              id="test-name"
              name="test_name"
              required
              placeholder="e.g. Week 1 Quiz"
              value={formValues.testName}
              onChange={(event) =>
                onFieldChange('testName', event.target.value)
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="test-description">Description</Label>
            <Input
              id="test-description"
              name="description"
              placeholder="Brief overview of the test..."
              value={formValues.description}
              onChange={(event) =>
                onFieldChange('description', event.target.value)
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="test-time-limit">Time Limit (mins)</Label>
              <Input
                id="test-time-limit"
                name="time_limit_minutes"
                type="number"
                min={1}
                max={600}
                placeholder="Optional"
                value={formValues.timeLimitMinutes}
                onChange={(event) =>
                  onFieldChange('timeLimitMinutes', event.target.value)
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="test-questions-per-attempt">
                Questions per Attempt
              </Label>
              <Input
                id="test-questions-per-attempt"
                name="questions_per_attempt"
                type="number"
                required
                min={1}
                max={200}
                value={formValues.questionsPerAttempt}
                onChange={(event) =>
                  onFieldChange('questionsPerAttempt', event.target.value)
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="test-subject">Subject</Label>
            <Select
              value={formValues.subjectId || null}
              onValueChange={(value) => onFieldChange('subjectId', value ?? '')}
              disabled={isLoadingSubjects || isSaving || subjects.length === 0}
            >
              <SelectTrigger
                id="test-subject"
                aria-label="Subject"
                className="h-9 w-full"
              >
                <SelectValue placeholder="Select subject">
                  {selectedSubjectLabel ??
                    (isLoadingSubjects ? 'Loading subjects...' : 'Select subject')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem
                    key={subject.subject_id}
                    value={String(subject.subject_id)}
                  >
                    {subject.subject_name} ({subject.course_title})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={isSaving || isLoadingSubjects}
            className="mt-2 w-full bg-navy text-white hover:bg-navy/90"
          >
            {isSaving && (
              <LoaderCircleIcon
                className="size-4 animate-spin"
                aria-hidden="true"
              />
            )}
            {isSaving ? 'Creating...' : 'Create'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

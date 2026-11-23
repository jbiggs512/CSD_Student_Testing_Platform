import { useMemo, useState } from 'react'
import {
  BarChart3Icon,
  ClockIcon,
  HelpCircleIcon,
  LoaderCircleIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components'
import type { LecturerTest } from '../model'

interface AllTestsCardProps {
  tests: readonly LecturerTest[]
  isLoading?: boolean
  onCreateTest: () => void
  onViewResults: (test: LecturerTest) => void
  onDeleteTest: (test: LecturerTest) => void
}

function formatAttemptSummary(test: LecturerTest): string {
  const attempts = test.attempt_count ?? 0
  const label = `${attempts} ${attempts === 1 ? 'attempt' : 'attempts'}`
  if (attempts > 0 && test.average_percentage !== null && test.average_percentage !== undefined) {
    return `${label} · Avg ${test.average_percentage}%`
  }
  return label
}

export function AllTestsCard({
  tests,
  isLoading = false,
  onCreateTest,
  onViewResults,
  onDeleteTest,
}: Readonly<AllTestsCardProps>) {
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all')

  const courseOptions = useMemo(
    () =>
      Array.from(new Set(tests.map((test) => test.course_title))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [tests],
  )

  const subjectOptions = useMemo(() => {
    const byId = new Map<number, { subject_id: number; subject_name: string }>()
    for (const test of tests) {
      if (selectedCourse !== 'all' && test.course_title !== selectedCourse) {
        continue
      }
      if (!byId.has(test.subject_id)) {
        byId.set(test.subject_id, {
          subject_id: test.subject_id,
          subject_name: test.subject_name,
        })
      }
    }
    return Array.from(byId.values()).sort((a, b) =>
      a.subject_name.localeCompare(b.subject_name),
    )
  }, [tests, selectedCourse])

  const activeCourse =
    selectedCourse !== 'all' && !courseOptions.includes(selectedCourse)
      ? 'all'
      : selectedCourse

  const activeSubjectId =
    selectedSubjectId !== 'all' &&
    !subjectOptions.some(
      (subject) => String(subject.subject_id) === selectedSubjectId,
    )
      ? 'all'
      : selectedSubjectId

  const selectedSubjectName = subjectOptions.find(
    (subject) => String(subject.subject_id) === activeSubjectId,
  )?.subject_name

  const filteredTests = useMemo(
    () =>
      tests.filter((test) => {
        if (activeCourse !== 'all' && test.course_title !== activeCourse) {
          return false
        }
        if (
          activeSubjectId !== 'all' &&
          String(test.subject_id) !== activeSubjectId
        ) {
          return false
        }
        return true
      }),
    [tests, activeCourse, activeSubjectId],
  )

  const hasActiveFilters =
    activeCourse !== 'all' || activeSubjectId !== 'all'

  function handleCourseChange(value: string) {
    setSelectedCourse(value)
    setSelectedSubjectId('all')
  }

  function handleClearFilters() {
    setSelectedCourse('all')
    setSelectedSubjectId('all')
  }

  let content: React.ReactNode

  if (isLoading && tests.length === 0) {
    content = (
      <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
        Loading tests...
      </div>
    )
  } else if (tests.length === 0) {
    content = (
      <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
        <p className="font-heading text-base font-semibold text-navy">
          No tests available yet
        </p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Click Create New Test to publish a test from a subject&apos;s
          question pool.
        </p>
      </div>
    )
  } else if (filteredTests.length === 0) {
    content = (
      <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
        <p className="font-heading text-base font-semibold text-navy">
          No tests match the selected filters
        </p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Try changing or clearing your course and subject filters.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          className="mt-4"
        >
          Clear filters
        </Button>
      </div>
    )
  } else {
    content = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTests.map((test) => (
          <Card
            key={test.test_id}
            className="justify-between gap-3 py-4 shadow-2xs"
          >
            <CardHeader className="gap-1 px-4">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="min-w-0 font-heading text-lg font-bold text-navy wrap-break-word">
                  {test.test_name}
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${test.test_name}`}
                  onClick={() => onDeleteTest(test)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2Icon className="size-4" aria-hidden="true" />
                </Button>
              </div>
              <CardDescription className="text-xs font-medium text-navy/80">
                Course: {test.course_title}
              </CardDescription>
              <CardDescription className="text-xs">
                Subject: {test.subject_name}
              </CardDescription>
              {test.description && (
                <p className="pt-1 text-xs text-muted-foreground">
                  {test.description}
                </p>
              )}
            </CardHeader>

            <CardFooter className="flex flex-wrap items-center justify-between gap-2 px-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="gap-1">
                  <HelpCircleIcon className="size-3" aria-hidden="true" />
                  {test.questions_per_attempt} questions
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <ClockIcon className="size-3" aria-hidden="true" />
                  {test.time_limit_minutes
                    ? `${test.time_limit_minutes} mins`
                    : 'Untimed'}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <BarChart3Icon className="size-3" aria-hidden="true" />
                  {formatAttemptSummary(test)}
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onViewResults(test)}
              >
                View Results
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4 px-6 pt-6">
        <CardTitle className="font-heading text-2xl font-bold text-navy">
          All Tests
        </CardTitle>
        <Button
          type="button"
          onClick={onCreateTest}
          className="bg-navy text-white hover:bg-navy/90"
        >
          <PlusIcon className="size-4" aria-hidden="true" />
          Create New Test
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 px-6 pb-6">
        {tests.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={activeCourse}
              onValueChange={(value) => handleCourseChange(value ?? 'all')}
            >
              <SelectTrigger
                aria-label="Filter by course"
                className="h-9 w-full sm:w-64"
              >
                <SelectValue placeholder="All courses">
                  {activeCourse === 'all' ? 'All courses' : activeCourse}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courseOptions.map((course) => (
                  <SelectItem key={course} value={course}>
                    {course}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={activeSubjectId}
              onValueChange={(value) => setSelectedSubjectId(value ?? 'all')}
            >
              <SelectTrigger
                aria-label="Filter by subject"
                className="h-9 w-full sm:w-64"
              >
                <SelectValue placeholder="All subjects">
                  {selectedSubjectName ?? 'All subjects'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjectOptions.map((subject) => (
                  <SelectItem
                    key={subject.subject_id}
                    value={String(subject.subject_id)}
                  >
                    {subject.subject_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
        {content}
      </CardContent>
    </Card>
  )
}

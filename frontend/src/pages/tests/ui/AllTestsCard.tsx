import {
  BarChart3Icon,
  BookOpenIcon,
  ClockIcon,
  HelpCircleIcon,
  LoaderCircleIcon,
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
} from '@shared/components'
import type { LecturerTest } from '../model'

interface AllTestsCardProps {
  tests: readonly LecturerTest[]
  isLoading?: boolean
  onViewResults: (test: LecturerTest) => void
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
  onViewResults,
}: Readonly<AllTestsCardProps>) {
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
          Use the Create New Test form to publish a test from a subject&apos;s
          question pool.
        </p>
      </div>
    )
  } else {
    content = (
      <div className="grid gap-4 sm:grid-cols-2">
        {tests.map((test) => (
          <Card
            key={test.test_id}
            className="justify-between gap-3 py-4 shadow-2xs"
          >
            <CardHeader className="gap-1 px-4">
              <CardTitle className="font-heading text-lg font-bold text-navy">
                {test.test_name}
              </CardTitle>
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
      <CardHeader className="flex flex-row items-center justify-between px-6 pt-6">
        <CardTitle className="font-heading text-2xl font-bold text-navy">
          All Tests
        </CardTitle>
        <BookOpenIcon className="size-6 text-coral" aria-hidden="true" />
      </CardHeader>
      <CardContent className="px-6 pb-6">{content}</CardContent>
    </Card>
  )
}

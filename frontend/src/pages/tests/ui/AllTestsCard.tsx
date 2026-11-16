import { BookOpenIcon, ClockIcon, HelpCircleIcon } from 'lucide-react'
import {
  Badge,
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
}

export function AllTestsCard({ tests }: Readonly<AllTestsCardProps>) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between px-6 pt-6">
        <CardTitle className="font-heading text-2xl font-bold text-navy">
          All Tests
        </CardTitle>
        <BookOpenIcon className="size-6 text-coral" aria-hidden="true" />
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {tests.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
            <p className="font-heading text-base font-semibold text-navy">
              No tests created in this session yet
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Use the Create New Test form to publish a test from a subject&apos;s
              question pool.
            </p>
          </div>
        ) : (
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

                <CardFooter className="flex flex-wrap items-center gap-2 px-4">
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
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

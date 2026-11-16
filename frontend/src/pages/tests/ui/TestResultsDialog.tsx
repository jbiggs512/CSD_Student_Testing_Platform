import { AlertCircleIcon, LoaderCircleIcon } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/components'
import type { LecturerTest, TestResultsDetail } from '../model'

interface TestResultsDialogProps {
  test: LecturerTest | null
  results: TestResultsDetail | null
  isLoading: boolean
  error: string | null
  onOpenChange: (open: boolean) => void
}

function SummaryMetricCard({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <Card className="gap-1 py-3 shadow-2xs">
      <CardHeader className="gap-0.5 px-4">
        <CardDescription className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </CardDescription>
        <CardTitle className="font-heading text-2xl font-bold text-navy">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

function formatCompletedAt(isoString: string): string {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) {
    return isoString
  }
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TestResultsDialog({
  test,
  results,
  isLoading,
  error,
  onOpenChange,
}: Readonly<TestResultsDialogProps>) {
  const subtitle = results
    ? `${results.course_title} · ${results.subject_name}`
    : test
      ? `${test.course_title} · ${test.subject_name}`
      : ''

  return (
    <Dialog open={test !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-navy">
            {test?.test_name ?? 'Test Results'}
          </DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircleIcon
              className="size-4 animate-spin"
              aria-hidden="true"
            />
            Loading test results...
          </div>
        )}

        {!isLoading && !error && results && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryMetricCard
                label="Attempts"
                value={String(results.attempt_count)}
              />
              <SummaryMetricCard
                label="Average Score"
                value={
                  results.average_percentage !== null
                    ? `${results.average_percentage}%`
                    : '—'
                }
              />
              <SummaryMetricCard
                label="Highest Score"
                value={
                  results.highest_score !== null
                    ? `${results.highest_score} pts`
                    : '—'
                }
              />
              <SummaryMetricCard
                label="Lowest Score"
                value={
                  results.lowest_score !== null
                    ? `${results.lowest_score} pts`
                    : '—'
                }
              />
            </div>

            {results.attempts.length === 0 ? (
              <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center">
                <p className="font-heading text-base font-semibold text-navy">
                  No student attempts yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Student scores will appear here once learners complete this
                  test.
                </p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Score %</TableHead>
                      <TableHead>Correct</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.attempts.map((attempt) => (
                      <TableRow key={attempt.attempt_id}>
                        <TableCell>
                          <div className="font-medium text-navy">
                            {attempt.student_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {attempt.username}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-12 font-semibold text-navy tabular-nums">
                              {attempt.percentage}%
                            </span>
                            <Progress
                              value={attempt.percentage}
                              className="w-20"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {attempt.correct_questions} / {attempt.total_questions}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{attempt.score} pts</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatCompletedAt(attempt.completed_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

import { Card, CardContent } from '@shared/components'
import type { Subject } from '../model'

interface SubjectSelectorCardProps {
  subjects: Subject[]
  selectedSubjectId: number | null
  isLoadingSubjects: boolean
  onSelectSubject: (subjectId: number) => void
}

export function SubjectSelectorCard({
  subjects,
  selectedSubjectId,
  isLoadingSubjects,
  onSelectSubject,
}: Readonly<SubjectSelectorCardProps>) {
  return (
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
              onChange={(event) => onSelectSubject(Number(event.target.value))}
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
  )
}

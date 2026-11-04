import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertCircleIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  Edit2Icon,
  LoaderCircleIcon,
  PowerIcon,
  SearchIcon,
  Trash2Icon,
} from 'lucide-react'
import { Alert, AlertDescription } from '@shared/components/ui/alert'
import { Button } from '@shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/components/ui/card'
import { Input } from '@shared/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@shared/components/ui/sheet'
import type {
  SubjectCreateRequest,
  Subject,
  SubjectStatus,
  SubjectUpdateRequest,
  Course,
} from '../model/types'
import {
  createSubject,
  deleteSubject,
  getSubjects,
  getCourses,
  SubjectApiError,
  updateSubject,
} from '../api'
import { SubjectsHeroPanel } from './SubjectsHeroPanel'

type StatusFilter = 'all' | SubjectStatus
type SortOption = 'name-asc' | 'name-desc' | 'course-asc' | 'status'

interface SubjectFormValues {
  subject_name: string
  course_id: string
}

const EMPTY_FORM: SubjectFormValues = {
  subject_name: '',
  course_id: '',
}

function getDisplayError(error: unknown): string {
  if (error instanceof SubjectApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

function StatusBadge({ status }: Readonly<{ status: SubjectStatus }>) {
  const isActive = status === 'active'

  return (
    <span
      className={
        isActive
          ? 'inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20'
          : 'inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border'
      }
    >
      {isActive ? 'Active' : 'Disabled'}
    </span>
  )
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string
  value: number
  description: string
}) {
  return (
    <Card className="gap-3 border-0 py-5 shadow-sm">
      <CardHeader className="gap-1 px-5">
        <CardDescription className="font-medium uppercase tracking-wide">
          {title}
        </CardDescription>
        <CardTitle className="font-heading text-4xl tabular-nums text-plum">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('name-asc')

  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [formValues, setFormValues] = useState<SubjectFormValues>(EMPTY_FORM)

  const loadSubjects = useCallback(async () => {
    setIsLoading(true)
    setPageError(null)

    try {
      const [subjectResult, courseResult] = await Promise.all([
        getSubjects(),
        getCourses(),
      ])
      setSubjects(subjectResult)
      setCourses(courseResult)
    } catch (error) {
      setPageError(getDisplayError(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSubjects()
  }, [loadSubjects])

  const activeCount = useMemo(
    () => subjects.filter((subject) => subject.status === 'active').length,
    [subjects],
  )

  const disabledCount = subjects.length - activeCount

  const filteredSubjects = useMemo(() => {
    const normalisedSearch = searchTerm.trim().toLocaleLowerCase()

    return subjects
      .filter((subject) => {
        const matchesSearch =
          normalisedSearch.length === 0 ||
          subject.subject_name.toLocaleLowerCase().includes(normalisedSearch) ||
          subject.course_title.toLocaleLowerCase().includes(normalisedSearch)

        const matchesStatus =
          statusFilter === 'all' || subject.status === statusFilter

        return matchesSearch && matchesStatus
      })
      .sort((left, right) => {
        if (sortOption === 'course-asc') {
          return left.course_title.localeCompare(right.course_title)
        }

        if (sortOption === 'status') {
          return left.status.localeCompare(right.status) ||
            left.subject_name.localeCompare(right.subject_name)
        }

        const nameComparison = left.subject_name.localeCompare(right.subject_name)
        return sortOption === 'name-desc' ? -nameComparison : nameComparison
      })
  }, [searchTerm, sortOption, statusFilter, subjects])

  function openCreateSheet() {
    setEditingSubject(null)
    setFormValues(EMPTY_FORM)
    setFormError(null)
    setIsSheetOpen(true)
  }

  function openEditSheet(subject: Subject) {
    setEditingSubject(subject)
    setFormValues({
      subject_name: subject.subject_name,
      course_id: String(subject.course_id),
    })
    setFormError(null)
    setIsSheetOpen(true)
  }

  function closeSheet(open: boolean) {
    setIsSheetOpen(open)
    if (!open) {
      setEditingSubject(null)
      setFormValues(EMPTY_FORM)
      setFormError(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    const subjectName = formValues.subject_name.trim()
    const courseId = Number(formValues.course_id)

    if (!subjectName) {
      setFormError('Enter a subject name.')
      return
    }

    if (!Number.isSafeInteger(courseId) || courseId < 1) {
      setFormError('Enter a valid course ID.')
      return
    }

    setIsSaving(true)

    try {
      if (editingSubject) {
        const changes: SubjectUpdateRequest = {
          subject_name: subjectName,
          course_id: courseId,
        }
        await updateSubject(editingSubject.subject_id, changes)
        setSuccessMessage('Subject updated successfully.')
      } else {
        const payload: SubjectCreateRequest = {
          subject_name: subjectName,
          course_id: courseId,
        }
        await createSubject(payload)
        setSuccessMessage('Subject created successfully.')
      }

      setIsSheetOpen(false)
      setEditingSubject(null)
      setFormValues(EMPTY_FORM)
      await loadSubjects()
    } catch (error) {
      setFormError(getDisplayError(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleStatus(subject: Subject) {
    setPageError(null)
    setSuccessMessage(null)

    const nextStatus: SubjectStatus =
      subject.status === 'active' ? 'disabled' : 'active'
    const action = nextStatus === 'active' ? 'enabled' : 'disabled'

    try {
      const changes: SubjectUpdateRequest = { status: nextStatus }
      await updateSubject(subject.subject_id, changes)
      setSuccessMessage(`Subject ${action} successfully.`)
      await loadSubjects()
    } catch (error) {
      setPageError(getDisplayError(error))
    }
  }

  async function handleDelete(subject: Subject) {
    const confirmed = window.confirm(
      `Delete "${subject.subject_name}"? This action cannot be undone.`,
    )

    if (!confirmed) return

    setPageError(null)
    setSuccessMessage(null)

    try {
      await deleteSubject(subject.subject_id)
      setSuccessMessage('Subject deleted successfully.')
      await loadSubjects()
    } catch (error) {
      setPageError(getDisplayError(error))
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 bg-[#f7f8fb] px-4 py-8 sm:px-6 lg:px-8">
      <SubjectsHeroPanel onAddSubject={openCreateSheet} />

      {pageError && (
        <Alert variant="destructive">
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <CheckCircle2Icon aria-hidden="true" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <section aria-label="Subject statistics" className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Total subjects"
          value={subjects.length}
          description="All subjects in the system"
        />
        <SummaryCard
          title="Active subjects"
          value={activeCount}
          description="Available for use"
        />
        <SummaryCard
          title="Disabled subjects"
          value={disabledCount}
          description="Retained but not active"
        />
      </section>

      <Card className="gap-0 border-0 py-0 shadow-md">
        <CardHeader className="gap-4 border-b py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-heading text-2xl font-bold text-plum">
              Subjects
            </CardTitle>
            <CardDescription>
              Search, edit and manage the subjects registered in the platform.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="relative min-w-0 sm:w-64">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search subjects"
                placeholder="Search subjects or courses..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex rounded-md border p-1" aria-label="Filter subjects by status">
              {(['all', 'active', 'disabled'] as const).map((filter) => (
                <Button
                  key={filter}
                  type="button"
                  size="sm"
                  variant={statusFilter === filter ? 'secondary' : 'ghost'}
                  aria-pressed={statusFilter === filter}
                  onClick={() => setStatusFilter(filter)}
                  className="capitalize"
                >
                  {filter === 'all' ? 'All' : filter}
                </Button>
              ))}
            </div>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Sort by
              <select
              aria-label="Sort subjects"
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="course-asc">Course</option>
              <option value="status">Status</option>
              </select>
            </label>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
              Loading subjects...
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="rounded-full bg-muted p-3">
                <BookOpenIcon className="size-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h2 className="font-medium">
                  {subjects.length === 0 ? 'No subjects yet' : 'No matching subjects'}
                </h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {subjects.length === 0
                    ? 'Create the first subject to make it available in the platform.'
                    : 'Try changing your search term or status filter.'}
                </p>
              </div>
              {subjects.length === 0 && (
                <Button onClick={openCreateSheet}>
                  Add your first subject
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-navy text-xs uppercase tracking-wide text-white/80">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-medium">Subject</th>
                    <th scope="col" className="px-6 py-3 font-medium">Course</th>
                    <th scope="col" className="px-6 py-3 font-medium">Status</th>
                    <th scope="col" className="px-6 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSubjects.map((subject) => (
                    <tr key={subject.subject_id} className="transition-colors hover:bg-pink/5">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">
                          {subject.subject_name}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Subject #{subject.subject_id}
                        </div>
                      </td>
                      <td className="px-6 py-4 tabular-nums text-muted-foreground">
                        {subject.course_title}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={subject.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditSheet(subject)}
                            aria-label={`Edit ${subject.subject_name}`}
                          >
                            <Edit2Icon aria-hidden="true" />
                            <span className="hidden lg:inline">Edit</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleToggleStatus(subject)}
                            aria-label={`${subject.status === 'active' ? 'Disable' : 'Enable'} ${subject.subject_name}`}
                          >
                            <PowerIcon aria-hidden="true" />
                            <span className="hidden lg:inline">
                              {subject.status === 'active' ? 'Disable' : 'Enable'}
                            </span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => void handleDelete(subject)}
                            aria-label={`Delete ${subject.subject_name}`}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2Icon aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={closeSheet}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle>
              {editingSubject ? 'Edit subject' : 'Create subject'}
            </SheetTitle>
            <SheetDescription>
              {editingSubject
                ? 'Update the subject name or its associated course.'
                : 'Add a subject and associate it with a course.'}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-4">
            {formError && (
              <Alert variant="destructive">
                <AlertCircleIcon aria-hidden="true" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="subject-name" className="text-sm font-medium">
                Subject name
              </label>
              <Input
                id="subject-name"
                name="subject_name"
                autoFocus
                required
                maxLength={150}
                placeholder="e.g. Software Engineering"
                value={formValues.subject_name}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    subject_name: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="course-id" className="text-sm font-medium">
                Course
              </label>
              <select
                id="course-id"
                name="course_id"
                required
                value={formValues.course_id}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    course_id: event.target.value,
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="" disabled>
                  Select a course
                </option>
                {courses.map((course) => (
                  <option key={course.course_id} value={course.course_id}>
                    {course.course_title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Select the course this subject belongs to.
              </p>
            </div>

            {editingSubject && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Current status</span>
                <div>
                  <StatusBadge status={editingSubject.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Change the status using the enable/disable action in the subject list.
                </p>
              </div>
            )}

            <SheetFooter className="mt-auto flex-col-reverse border-t px-0 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => closeSheet(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && (
                  <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
                )}
                {isSaving
                  ? 'Saving...'
                  : editingSubject
                    ? 'Save changes'
                    : 'Create subject'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </main>
  )
}

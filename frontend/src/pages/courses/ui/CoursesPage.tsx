import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode, SubmitEvent } from 'react'
import {
  AlertCircleIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  Edit2Icon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
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
import type { Course, CourseCreateRequest } from '@/pages/subjects/model'
import {
  CourseApiError,
  createCourse,
  getCourses,
  updateCourse,
} from '@/pages/subjects/api'

function getDisplayError(error: unknown): string {
  if (error instanceof CourseApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

export function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [courseTitle, setCourseTitle] = useState('')

  const loadCourses = useCallback(async () => {
    try {
      setCourses(await getCourses())
    } catch (error) {
      setPageError(getDisplayError(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isCurrent = true

    void getCourses()
      .then((result) => {
        if (isCurrent) setCourses(result)
      })
      .catch((error: unknown) => {
        if (isCurrent) setPageError(getDisplayError(error))
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  const filteredCourses = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase()
    return courses
      .filter((course) => course.course_title.toLocaleLowerCase().includes(search))
      .sort((left, right) => left.course_title.localeCompare(right.course_title))
  }, [courses, searchTerm])

  function openCreateSheet() {
    setEditingCourse(null)
    setCourseTitle('')
    setFormError(null)
    setIsSheetOpen(true)
  }

  function openEditSheet(course: Course) {
    setEditingCourse(course)
    setCourseTitle(course.course_title)
    setFormError(null)
    setIsSheetOpen(true)
  }

  function closeSheet(open: boolean) {
    setIsSheetOpen(open)
    if (!open) {
      setEditingCourse(null)
      setCourseTitle('')
      setFormError(null)
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setPageError(null)
    setSuccessMessage(null)

    const title = courseTitle.trim()
    if (!title) {
      setFormError('Enter a course title.')
      return
    }

    setIsSaving(true)
    try {
      const request: CourseCreateRequest = { course_title: title }
      if (editingCourse) {
        await updateCourse(editingCourse.course_id, request)
        setSuccessMessage('Course updated successfully.')
      } else {
        await createCourse(request)
        setSuccessMessage('Course created successfully.')
      }

      closeSheet(false)
      await loadCourses()
    } catch (error) {
      setFormError(getDisplayError(error))
    } finally {
      setIsSaving(false)
    }
  }

  let submitLabel = 'Create course'
  if (editingCourse) submitLabel = 'Save changes'
  if (isSaving) submitLabel = 'Saving...'

  let coursesContent: ReactNode
  if (isLoading) {
    coursesContent = (
      <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
        Loading courses...
      </div>
    )
  } else if (filteredCourses.length === 0) {
    const hasNoCourses = courses.length === 0
    let emptyStateTitle = 'No matching courses'
    let emptyStateDescription = 'Try changing your search term.'
    if (hasNoCourses) {
      emptyStateTitle = 'No courses yet'
      emptyStateDescription =
        'Create the first course to make it available in the platform.'
    }

    coursesContent = (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="rounded-full bg-muted p-3">
          <BookOpenIcon className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h2 className="font-medium">{emptyStateTitle}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {emptyStateDescription}
          </p>
        </div>
        {hasNoCourses && (
          <Button onClick={openCreateSheet}>Add your first course</Button>
        )}
      </div>
    )
  } else {
    coursesContent = (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-navy text-xs uppercase tracking-wide text-white/80">
            <tr>
              <th scope="col" className="px-6 py-3 font-medium">Course</th>
              <th scope="col" className="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredCourses.map((course) => (
              <tr key={course.course_id} className="transition-colors hover:bg-pink/5">
                <td className="px-6 py-4">
                  <div className="font-medium text-foreground">
                    {course.course_title}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Course #{course.course_id}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditSheet(course)}
                      aria-label={`Edit ${course.course_title}`}
                    >
                      <Edit2Icon aria-hidden="true" />
                      Edit
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  let formTitle = 'Create course'
  let formDescription = 'Add a course to the platform.'
  if (editingCourse) {
    formTitle = 'Edit course'
    formDescription = 'Update the course title.'
  }

  return (
    <main className="flex min-h-screen w-full flex-col gap-8 bg-[#f7f8fb] p-4">
      <section className="flex flex-col gap-5 rounded-2xl bg-navy p-8 text-white shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
            Administration
          </p>
          <h1 className="mt-2 font-heading text-4xl font-bold tracking-tight text-white">
            Manage courses
          </h1>
          <p className="mt-3 text-base leading-7 text-white/80">
            Create and update the courses available across the platform.
          </p>
        </div>
        <Button onClick={openCreateSheet} className="shrink-0 bg-white text-navy hover:bg-white/90">
          <PlusIcon aria-hidden="true" />
          Add course
        </Button>
      </section>

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

      <Card className="gap-0 border-0 py-0 shadow-md">
        <CardHeader className="gap-4 border-b py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-heading text-2xl font-bold text-plum">
              Courses
            </CardTitle>
            <CardDescription>
              Search and edit the courses registered in the platform.
            </CardDescription>
          </div>
          <div className="relative min-w-0 sm:w-64">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Search courses"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {coursesContent}
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={closeSheet}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle>{formTitle}</SheetTitle>
            <SheetDescription>{formDescription}</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-4">
            {formError && (
              <Alert variant="destructive">
                <AlertCircleIcon aria-hidden="true" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label htmlFor="course-title" className="text-sm font-medium">
                Course title
              </label>
              <Input
                id="course-title"
                name="course_title"
                autoFocus
                required
                maxLength={160}
                placeholder="e.g. BSc Software Engineering"
                value={courseTitle}
                onChange={(event) => setCourseTitle(event.target.value)}
              />
            </div>
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
                {submitLabel}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </main>
  )
}

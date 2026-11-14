import { useEffect, useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import { CheckCircle2 } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  AuthSplitLayout,
  Button,
  Input,
  Label,
  PasswordInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components'
import {
  getAvailableCourses,
  RegisterApiError,
  registerStudent,
} from '../api'
import {
  validateRegistrationInput,
  type CourseOption,
  type RegistrationFormInput,
} from '../model'

const INITIAL_FORM: RegistrationFormInput = {
  studentNumber: '',
  firstName: '',
  lastName: '',
  courseId: '',
  email: '',
  password: '',
}

const TOP_TEXT_FIELDS = [
  {
    key: 'studentNumber',
    id: 'student-number',
    label: 'Student Number',
    autoComplete: 'username',
    placeholder: 'Enter your student number',
  },
  {
    key: 'firstName',
    id: 'first-name',
    label: 'First Name',
    autoComplete: 'given-name',
    placeholder: 'Enter your first name',
  },
  {
    key: 'lastName',
    id: 'last-name',
    label: 'Last Name',
    autoComplete: 'family-name',
    placeholder: 'Enter your last name',
  },
] as const

export function RegisterPage() {
  const [form, setForm] = useState<RegistrationFormInput>(INITIAL_FORM)
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRegistered, setIsRegistered] = useState(false)

  useEffect(() => {
    let active = true

    getAvailableCourses()
      .then((result) => {
        if (active) setCourses(result)
      })
      .catch((err: unknown) => {
        if (active) {
          setErrorMessage(
            err instanceof RegisterApiError
              ? err.message
              : 'Unable to load courses right now. Please try again.',
          )
        }
      })
      .finally(() => {
        if (active) setIsLoadingCourses(false)
      })

    return () => {
      active = false
    }
  }, [])

  function updateField<K extends keyof RegistrationFormInput>(
    field: K,
    value: RegistrationFormInput[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const selectedCourseTitle = courses.find(
    (course) => String(course.course_id) === form.courseId,
  )?.course_title

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsRegistered(false)

    const validationError = validateRegistrationInput(form)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await registerStudent({
        username: form.studentNumber.trim(),
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        courses: [Number(form.courseId)],
      })
      setIsRegistered(true)
      setForm(INITIAL_FORM)
    } catch (err) {
      setErrorMessage(
        err instanceof RegisterApiError
          ? err.message
          : 'Unable to register right now. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthSplitLayout
      id="register-page"
      title="Register to Altius"
      subtitle="Accounts will need lecturer approval before becoming active"
      headerPromptText="Have an account? Log in now!"
      headerActionLabel="Login"
      headerActionTo="/login"
      errorMessage={errorMessage}
    >
      {isRegistered && (
        <Alert className="mb-4 border-emerald-600/30 bg-emerald-50 text-emerald-800">
          <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-700" />
          <AlertDescription className="text-emerald-800">
            Registration submitted! Your account is pending lecturer approval
            before you can{' '}
            <Link to="/login" className="font-semibold underline">
              log in
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
        {TOP_TEXT_FIELDS.map((field) => (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id}>{field.label}</Label>
            <Input
              id={field.id}
              name={field.key}
              type="text"
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              value={form[field.key]}
              onChange={(e) => updateField(field.key, e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        ))}

        <div className="space-y-1.5">
          <Label htmlFor="course">Course</Label>
          <Select
            value={form.courseId || null}
            onValueChange={(val) => updateField('courseId', val ?? '')}
            disabled={isSubmitting || isLoadingCourses}
          >
            <SelectTrigger id="course" aria-label="Course" className="h-9 w-full">
              <SelectValue placeholder="Select course">
                {selectedCourseTitle ?? 'Select course'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem
                  key={course.course_id}
                  value={String(course.course_id)}
                >
                  {course.course_title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="register-email">Email</Label>
          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="register-password">Password</Label>
          <PasswordInput
            id="register-password"
            name="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="mt-2 w-full bg-navy text-white hover:bg-navy/90"
        >
          {isSubmitting ? 'Registering...' : 'Register'}
        </Button>
      </form>
    </AuthSplitLayout>
  )
}

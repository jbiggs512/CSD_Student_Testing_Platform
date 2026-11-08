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
import { validateRegistrationInput, type CourseOption } from '../model'

export function RegisterPage() {
  const [studentNumber, setStudentNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [courseId, setCourseId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [courses, setCourses] = useState<CourseOption[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRegistered, setIsRegistered] = useState(false)

  useEffect(() => {
    let isMounted = true

    getAvailableCourses()
      .then((loadedCourses) => {
        if (isMounted) {
          setCourses(loadedCourses)
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setErrorMessage(
            error instanceof RegisterApiError
              ? error.message
              : 'Unable to load courses right now. Please try again.',
          )
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCourses(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const selectedCourseTitle = courses.find(
    (course) => String(course.course_id) === courseId,
  )?.course_title

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsRegistered(false)

    const validationError = validateRegistrationInput({
      studentNumber,
      firstName,
      lastName,
      courseId,
      email,
      password,
    })

    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await registerStudent({
        username: studentNumber.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
        courses: [Number(courseId)],
      })
      setIsRegistered(true)
      setStudentNumber('')
      setFirstName('')
      setLastName('')
      setCourseId('')
      setEmail('')
      setPassword('')
    } catch (error) {
      if (error instanceof RegisterApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Unable to register right now. Please try again.')
      }
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
        <div className="space-y-1.5">
          <Label htmlFor="student-number">Student Number</Label>
          <Input
            id="student-number"
            name="studentNumber"
            type="text"
            autoComplete="username"
            placeholder="Enter your student number"
            value={studentNumber}
            onChange={(event) => setStudentNumber(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="first-name">First Name</Label>
          <Input
            id="first-name"
            name="firstName"
            type="text"
            autoComplete="given-name"
            placeholder="Enter your first name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="last-name">Last Name</Label>
          <Input
            id="last-name"
            name="lastName"
            type="text"
            autoComplete="family-name"
            placeholder="Enter your last name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="course">Course</Label>
          <Select
            value={courseId || null}
            onValueChange={(value) => setCourseId(value ?? '')}
            disabled={isSubmitting || isLoadingCourses}
          >
            <SelectTrigger
              id="course"
              aria-label="Course"
              className="h-9 w-full"
            >
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
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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

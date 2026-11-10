import type { AuthUser } from '@shared/api'

export interface CourseOption {
  course_id: number
  course_title: string
}

export interface StudentRegistrationRequest {
  username: string
  first_name: string
  last_name: string
  email: string
  password: string
  courses: number[]
}

export type RegisteredStudentResponse = AuthUser

/**
 * Matches valid student numbers / usernames (3-50 alphanumeric characters, dots, underscores, or hyphens).
 */
export const STUDENT_NUMBER_REGEX = /^[A-Za-z0-9._-]{3,50}$/

/**
 * Enforces strict password complexity:
 * - At least 8 characters
 * - At least one uppercase letter, one lowercase letter, one digit, and one special character
 */
export const PASSWORD_COMPLEXITY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/

export interface RegistrationFormInput {
  studentNumber: string
  firstName: string
  lastName: string
  courseId: string
  email: string
  password: string
}

export function validateRegistrationInput(
  input: RegistrationFormInput,
): string | null {
  const values = [
    input.studentNumber,
    input.firstName,
    input.lastName,
    input.courseId,
    input.email,
  ].map((v) => v.trim())

  if (values.some((v) => !v) || !input.password) {
    return 'Incorrect Input, Please try again. All fields are required.'
  }

  const [studentNumber, , , , email] = values

  if (!STUDENT_NUMBER_REGEX.test(studentNumber)) {
    return 'Incorrect Input, Please try again. Student Number must be 3-50 letters or numbers with no spaces.'
  }

  if (!EMAIL_REGEX.test(email)) {
    return 'Incorrect Input, Please try again. Please enter a valid email address.'
  }

  if (!PASSWORD_COMPLEXITY_REGEX.test(input.password)) {
    return 'Incorrect Input, Please try again. Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.'
  }

  return null
}

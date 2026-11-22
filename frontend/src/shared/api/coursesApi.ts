import { getAccessToken } from './authSession'
import { API_BASE_URL } from '../config'

export interface Course {
  course_id: number
  course_title: string
}

const COURSES_URL = `${API_BASE_URL}/course`

export async function getCourses(): Promise<Course[]> {
  const token = getAccessToken()

  if (!token) {
    throw new Error('Your session has expired. Please sign in again.')
  }

  const response = await fetch(COURSES_URL, {
    headers: { Authorization: 'Bearer ' + token },
  })

  if (!response.ok) {
    throw new Error('Unable to load courses. Please try again.')
  }

  return (await response.json()) as Course[]
}

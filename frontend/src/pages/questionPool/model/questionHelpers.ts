import { sanitizeInputText } from '@shared/lib/utils'
import type { Question, QuestionBulkItemInput, QuestionOptionInput } from './types'

export interface QuestionFormValues {
  question_text: string
  options: [string, string, string, string]
  correctIndex: number
}

export interface QuestionRowItem {
  question: Question
  code: string
}

export const EMPTY_FORM: QuestionFormValues = {
  question_text: '',
  options: ['', '', '', ''],
  correctIndex: 0,
}

export const SAMPLE_BULK_JSON = JSON.stringify(
  [
    {
      question_text: 'Which HTTP method is idempotent and used to replace a resource?',
      options: [
        { option_text: 'POST', is_correct: false },
        { option_text: 'PUT', is_correct: true },
        { option_text: 'PATCH', is_correct: false },
        { option_text: 'CONNECT', is_correct: false },
      ],
    },
  ],
  null,
  2,
)

export function getSubjectPrefix(subjectName: string | undefined): string {
  if (!subjectName) return 'QUE'
  const words = subjectName
    .trim()
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
  if (words.length >= 3) {
    return words
      .slice(0, 3)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
  }
  const cleaned = subjectName.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return (cleaned.slice(0, 3) || 'QUE').padEnd(3, 'X')
}

export function formatQuestionCode(
  question: Question,
  subjectName: string | undefined,
): string {
  if (question.question_code) return question.question_code
  const prefix = getSubjectPrefix(subjectName)
  return `${prefix}-${String(question.question_id).padStart(3, '0')}`
}

function failBulkParse(error: string) {
  return { items: null, error }
}

export function parseBulkQuestionsJson(
  rawJson: string,
  existingQuestions: Question[] = [],
): {
  items: QuestionBulkItemInput[] | null
  error: string | null
} {
  const trimmed = rawJson.trim()
  if (!trimmed) {
    return failBulkParse('Upload a JSON file or paste JSON content.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return failBulkParse('Invalid JSON syntax.')
  }

  const rawItems = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' &&
        parsed !== null &&
        Array.isArray((parsed as { questions?: unknown }).questions)
      ? (parsed as { questions: unknown[] }).questions
      : null

  if (!rawItems) {
    return failBulkParse(
      'JSON must be an array of questions or an object with a "questions" array.',
    )
  }
  if (rawItems.length === 0) {
    return failBulkParse('At least one question is required.')
  }

  const existingKeys = new Set(
    existingQuestions.map((q) => sanitizeInputText(q.question_text).toLowerCase()),
  )
  const seenInBatch = new Set<string>()
  const normalized: QuestionBulkItemInput[] = []

  for (let i = 0; i < rawItems.length; i += 1) {
    const label = `Question ${i + 1}`
    const entry = rawItems[i]
    if (typeof entry !== 'object' || entry === null) {
      return failBulkParse(`${label}: must be an object.`)
    }

    const questionText = (entry as { question_text?: unknown }).question_text
    const cleanedQuestionText =
      typeof questionText === 'string' ? sanitizeInputText(questionText) : ''
    if (!cleanedQuestionText) {
      return failBulkParse(`${label}: "question_text" must be a non-empty string.`)
    }

    const normalizedKey = cleanedQuestionText.toLowerCase()
    if (seenInBatch.has(normalizedKey)) {
      return failBulkParse(`${label}: Duplicate question in upload.`)
    }
    if (existingKeys.has(normalizedKey)) {
      return failBulkParse(`${label}: Question already exists in this subject.`)
    }
    seenInBatch.add(normalizedKey)

    const options = (entry as { options?: unknown }).options
    if (!Array.isArray(options) || options.length !== 4) {
      return failBulkParse(`${label}: "options" must be an array of exactly 4 items.`)
    }

    const normalizedOptions: QuestionOptionInput[] = []
    let correctCount = 0

    for (let j = 0; j < options.length; j += 1) {
      const opt = options[j]
      if (typeof opt !== 'object' || opt === null) {
        return failBulkParse(`${label}, Option ${j + 1}: must be an object.`)
      }

      const optionText = (opt as { option_text?: unknown }).option_text
      const isCorrect = (opt as { is_correct?: unknown }).is_correct
      const cleanedOptionText =
        typeof optionText === 'string' ? sanitizeInputText(optionText) : ''

      if (!cleanedOptionText) {
        return failBulkParse(`${label}, Option ${j + 1}: "option_text" is required.`)
      }
      if (typeof isCorrect !== 'boolean') {
        return failBulkParse(`${label}, Option ${j + 1}: "is_correct" must be a boolean.`)
      }

      if (isCorrect) correctCount += 1
      normalizedOptions.push({ option_text: cleanedOptionText, is_correct: isCorrect })
    }

    if (correctCount !== 1) {
      return failBulkParse(
        `${label}: exactly one option must have "is_correct": true.`,
      )
    }

    normalized.push({
      question_text: cleanedQuestionText,
      options: normalizedOptions,
    })
  }

  return { items: normalized, error: null }
}

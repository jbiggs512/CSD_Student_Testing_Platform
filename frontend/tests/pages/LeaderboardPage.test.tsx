import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LeaderboardPage } from '@/pages/leaderboard'
import { ComparisonCard } from '@/pages/leaderboard/ui/ComparisonCard'
import { ScoreDistributionCard } from '@/pages/leaderboard/ui/ScoreDistributionCard'
import type { CohortComparisonResponse, ScoreDistributionResponse } from '@/pages/leaderboard/model'
import { cloneElement, type ReactElement } from 'react'

const {
  getCourseTitle,
  getSubjects,
  getLeaderboard,
  getCohortComparison,
  getScoreDistribution,
} = vi.hoisted(() => ({
  getCourseTitle: vi.fn(),
  getSubjects: vi.fn(),
  getLeaderboard: vi.fn(),
  getCohortComparison: vi.fn().mockResolvedValue(undefined),
  getScoreDistribution: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/pages/leaderboard/api', () => ({
  getCourseTitle,
  getSubjects,
  getLeaderboard,
  getCohortComparison,
  getScoreDistribution,
}))

const subjects = [
  { label: 'Mathematics', value: 7 },
  { label: 'Science', value: 8 },
]

const leaderboard = {
  top_students: [
    { user_id: 2, rank: 1, name: 'John D.', avg_score: 96, points: 1860 },
    { user_id: 3, rank: 2, name: 'Jane D.', avg_score: 93, points: 1820 },
  ],
  current_user_entry: undefined,
  is_in_top_5: true,
}

const emptyLeaderboard = {
  top_students: [
    { user_id: 2, rank: 1, name: 'John D.', avg_score: 0, points: 0 },
    { user_id: 3, rank: 1, name: 'Jane D.', avg_score: 0, points: 0 },
  ],
  current_user_entry: undefined,
  is_in_top_5: true,
}

const cohortComparison = {
  subject: 'Mathematics',
  top5_average: 92,
  user_average: 80,
  cohort_average: 74,
}

const scoreDistribution = {
  subject: 'Mathematics',
  bands: [
    { band: '0-20', count: 1 },
    { band: '81-100', count: 4 },
  ],
  user_band: '81-100',
  user_score: 80,
}

const comparisonData: CohortComparisonResponse = {
  subject: 'Mathematics',
  top5_average: 92,
  user_average: 80,
  cohort_average: 74,
}

const distributionData: ScoreDistributionResponse = {
  subject: 'Mathematics',
  bands: [
    { band: '0-20', count: 1 },
    { band: '21-40', count: 2 },
    { band: '81-100', count: 5 },
  ],
  user_band: '81-100',
  user_score: 83,
}

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) => (
      <div style={{ width: 800, height: 400 }}>
        {cloneElement(children as ReactElement<{ width?: number; height?: number }>, {
          width: 800,
          height: 400,
        })}
      </div>
    ),
  }
})

function renderLeaderboardPage() {
  return render(<LeaderboardPage />)
}

function pressAndRelease(el: HTMLElement) {
  fireEvent.pointerDown(el, { button: 0, pointerType: 'mouse' })
  fireEvent.mouseDown(el, { button: 0 })
  fireEvent.pointerUp(el, { button: 0, pointerType: 'mouse' })
  fireEvent.mouseUp(el, { button: 0 })
  fireEvent.click(el, { button: 0 })
}

describe('Leaderboard Page', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('shows a loading message while the course data is pending', () => {
    getCourseTitle.mockReturnValue(new Promise(() => undefined))

    renderLeaderboardPage()

    expect(screen.getByText('Leaderboard data is loading...')).toBeDefined()
  })

  it('loads the first subject leaderboard and renders its results', async () => {
    getCourseTitle.mockResolvedValue('BSc Software Engineering')
    getSubjects.mockResolvedValue(subjects)
    getLeaderboard.mockResolvedValue(leaderboard)
    getCohortComparison.mockResolvedValue(cohortComparison)
    getScoreDistribution.mockResolvedValue(scoreDistribution)
    renderLeaderboardPage()

    expect(await screen.findByRole('heading', { name: 'Leaderboards' })).toBeDefined()
    expect(await screen.findByText('BSc Software Engineering')).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Top 5 Students' })).toBeDefined()
    expect(screen.getByText('John D.')).toBeDefined()
    expect(screen.getByText('96%')).toBeDefined()
    expect(screen.getByText('1860')).toBeDefined()
    expect(screen.getByText('You vs Cohort vs Top 5' )).toBeDefined()
    expect(screen.getByText('Comparison against the top 5 students average and the entire cohort average.')).toBeDefined()
    expect(screen.getByText('Cohort Score Distribution')).toBeDefined()
    expect(screen.getByText('Number of students per score band for Mathematics.')).toBeDefined()

    expect(getCourseTitle).toHaveBeenCalledOnce()
    expect(getSubjects).toHaveBeenCalledOnce()
    expect(getLeaderboard).toHaveBeenCalledOnce()
    expect(getLeaderboard).toHaveBeenCalledWith(subjects[0].value)
    expect(getCohortComparison).toHaveBeenCalledOnce()
    expect(getScoreDistribution).toHaveBeenCalledOnce()
  })

  it('displays a message when the leaderboard is empty', async () => {
    getCourseTitle.mockResolvedValue('BSc Software Engineering')
    getSubjects.mockResolvedValue(subjects)
    getLeaderboard.mockResolvedValue(emptyLeaderboard)

    renderLeaderboardPage()

    expect(await screen.findByRole('heading', { name: 'Leaderboards' })).toBeDefined()
    expect(await screen.findByText('BSc Software Engineering')).toBeDefined()
    expect(screen.getByRole('heading', { name: 'No Completed Tests' })).toBeDefined()
    expect(screen.getByText('No tests have been completed for this subject yet. Please check back later.')).toBeDefined()

    expect(getCourseTitle).toHaveBeenCalledTimes(1)
    expect(getSubjects).toHaveBeenCalledTimes(1)
    expect(getLeaderboard).toHaveBeenCalledOnce()
    expect(getLeaderboard).toHaveBeenCalledWith(subjects[0].value)
  })

  it('reloads leaderboard, comparison, and score distribution for the selected subject', async () => {
    const scienceLeaderboard = {
      ...leaderboard,
      top_students: [
        { user_id: 4, rank: 1, name: 'Sam S.', avg_score: 88, points: 1650 },
      ],
    }
    getCourseTitle.mockResolvedValue('BSc Software Engineering')
    getSubjects.mockResolvedValue(subjects)
    getLeaderboard.mockImplementation((subjectId: number) =>
      Promise.resolve(subjectId === 7 ? leaderboard : scienceLeaderboard),
    )
    getCohortComparison.mockImplementation((subjectId: number) =>
      Promise.resolve({
        subject: subjectId === 7 ? 'Mathematics' : 'Science',
        top5_average: subjectId === 7 ? 92 : 86,
        user_average: subjectId === 7 ? 80 : 78,
        cohort_average: subjectId === 7 ? 74 : 72,
      }),
    )
    getScoreDistribution.mockImplementation((subjectId: number) =>
      Promise.resolve({
        subject: subjectId === 7 ? 'Mathematics' : 'Science',
        bands: [
          { band: '0-20', count: 1 },
          { band: '81-100', count: 4 },
        ],
        user_band: '81-100',
        user_score: subjectId === 7 ? 80 : 78,
      }),
    )

    renderLeaderboardPage()
    expect(await screen.findByText('John D.')).toBeDefined()
    expect(await screen.findByText('Average score for Mathematics')).toBeDefined()
    expect(screen.getByText('Number of students per score band for Mathematics.')).toBeDefined()

    pressAndRelease(screen.getByRole('combobox', { name: 'Subject' }))
    pressAndRelease(await screen.findByRole('option', { name: 'Science' }))

    expect(await screen.findByText('Sam S.')).toBeDefined()
    expect(await screen.findByText('Average score for Science')).toBeDefined()
    expect(screen.getByText('Number of students per score band for Science.')).toBeDefined()
    await waitFor(() => {
      expect(getLeaderboard).toHaveBeenLastCalledWith(8)
      expect(getCohortComparison).toHaveBeenLastCalledWith(8)
      expect(getScoreDistribution).toHaveBeenLastCalledWith(8)
    })
  })

  it('reloads leaderboard after an empty result', async () => {
    getCourseTitle.mockResolvedValue('BSc Software Engineering')
    getSubjects.mockResolvedValue(subjects)
    getLeaderboard.mockImplementation((subjectId: number) =>
      Promise.resolve(subjectId === 7 ? emptyLeaderboard : leaderboard),
    )

    renderLeaderboardPage()
    expect(await screen.findByRole('heading', { name: 'No Completed Tests' })).toBeDefined()

    pressAndRelease(screen.getByRole('combobox', { name: 'Subject' }))
    pressAndRelease(await screen.findByRole('option', { name: 'Science' }))

    expect(await screen.findByText('John D.')).toBeDefined()
    expect(await screen.findByText('Average score for Science')).toBeDefined()
    expect(screen.getByText('Number of students per score band for Science.')).toBeDefined()
    await waitFor(() => {
      expect(getLeaderboard).toHaveBeenLastCalledWith(8)
    })
  })


  it('renders the current student separately when outside the top five', async () => {
    getCourseTitle.mockResolvedValue('BSc Software Engineering')
    getSubjects.mockResolvedValue(subjects)
    getLeaderboard.mockResolvedValue({
      ...leaderboard,
      current_user_entry: {
        user_id: 11,
        rank: 12,
        name: 'Test S.',
        avg_score: 75.5,
        points: 400,
      },
      is_in_top_5: false,
    })

    renderLeaderboardPage()

    expect(await screen.findByText('Test S.')).toBeDefined()
    expect(screen.getByText('75.5%')).toBeDefined()
    expect(screen.getByText('400')).toBeDefined()
    expect(screen.getByText('Your position')).toBeDefined()
  })

  it('skips the leaderboard request when the student has no subjects', async () => {
    getCourseTitle.mockResolvedValue('BSc Software Engineering')
    getSubjects.mockResolvedValue([])

    renderLeaderboardPage()

    expect(getLeaderboard).not.toHaveBeenCalled()
  })
})

describe('Comparison Card', () => {
  afterEach(cleanup)

  it('renders the card title, description, and subject', () => {
    render(<ComparisonCard data={comparisonData} />)

    expect(screen.getByText('You vs Cohort vs Top 5')).toBeTruthy()
    expect(
      screen.getByText(
        'Comparison against the top 5 students average and the entire cohort average.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Average score for Mathematics')).toBeTruthy()
  })

  it('renders every comparison label and score', () => {
    render(<ComparisonCard data={comparisonData} />)

    expect(screen.getAllByText('Top 5 avg').length).toBeGreaterThan(0)
    expect(screen.getAllByText('You').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Cohort avg').length).toBeGreaterThan(0)
    expect(screen.getByText('92%')).toBeTruthy()
    expect(screen.getByText('80%')).toBeTruthy()
    expect(screen.getByText('74%')).toBeTruthy()
  })
})

describe('Score Distribution Card', () => {
  afterEach(cleanup)

  it('renders the card title, description, and subject', () => {
    render(<ScoreDistributionCard data={distributionData} />)

    expect(screen.getByText('Cohort Score Distribution')).toBeTruthy()
    expect(
      screen.getByText('Number of students per score band for Mathematics.'),
    ).toBeTruthy()
  })

  it('renders every score band and count', () => {
    render(<ScoreDistributionCard data={distributionData} />)

    expect(screen.getByText('0-20')).toBeTruthy()
    expect(screen.getByText('21-40')).toBeTruthy()
    expect(screen.getByText('81-100')).toBeTruthy()
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('labels the user band with the current score', () => {
    render(<ScoreDistributionCard data={distributionData} />)

    expect(screen.getByText('You: 83%')).toBeTruthy()
  })
})

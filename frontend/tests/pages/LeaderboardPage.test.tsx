import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { cloneElement, type ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LeaderboardPage } from '@/pages/leaderboard'
import { ComparisonCard } from '@/pages/leaderboard/ui/ComparisonCard'
import { ScoreDistributionCard } from '@/pages/leaderboard/ui/ScoreDistributionCard'

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

    renderLeaderboardPage()

    expect(await screen.findByRole('heading', { name: 'Leaderboards' })).toBeDefined()
    expect(await screen.findByText('BSc Software Engineering')).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Top 5 Students' })).toBeDefined()
    expect(screen.getByText('John D.')).toBeDefined()
    expect(screen.getByText('96%')).toBeDefined()
    expect(screen.getByText('1860')).toBeDefined()

    expect(getCourseTitle).toHaveBeenCalledTimes(1)
    expect(getSubjects).toHaveBeenCalledTimes(1)
    expect(getLeaderboard).toHaveBeenCalledOnce()
    expect(getLeaderboard).toHaveBeenCalledWith(subjects[0].value)
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

describe('Leaderboard chart cards', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the comparison card title, description, subject, and averages', () => {
    const { container } = render(
      <ComparisonCard
        data={{
          subject: 'Mathematics',
          top5_average: 92,
          user_average: 80,
          cohort_average: 74,
        }}
      />,
    )
    const view = within(container)

    expect(view.getByText('You vs Cohort vs Top 5')).toBeDefined()
    expect(view.getByText('Comparison against the top 5 students average and the entire cohort average.')).toBeDefined()
    expect(view.getByText('Average score for Mathematics')).toBeDefined()
    expect(view.getByText('92%')).toBeDefined()
    expect(view.getByText('80%')).toBeDefined()
    expect(view.getByText('74%')).toBeDefined()
  })

  it('renders all comparison categories in the chart', () => {
    const { container } = render(
      <ComparisonCard
        data={{
          subject: 'Science',
          top5_average: 88,
          user_average: 78,
          cohort_average: 72,
        }}
      />,
    )
    const view = within(container)

    expect(view.getByText('Top 5 avg')).toBeDefined()
    expect(view.getByText('You')).toBeDefined()
    expect(view.getByText('Cohort avg')).toBeDefined()
  })

  it('renders the score distribution title, description, bands, and counts', () => {
    const { container } = render(
      <ScoreDistributionCard
        data={{
          subject: 'Mathematics',
          bands: [
            { band: '0-20', count: 1 },
            { band: '21-40', count: 3 },
            { band: '81-100', count: 6 },
          ],
          user_band: '81-100',
          user_score: 83,
        }}
      />,
    )
    const view = within(container)

    expect(view.getByText('Cohort Score Distribution')).toBeDefined()
    expect(view.getByText('Number of students per score band for Mathematics.')).toBeDefined()
    expect(view.getByText('0-20')).toBeDefined()
    expect(view.getByText('21-40')).toBeDefined()
    expect(view.getByText('81-100')).toBeDefined()
    expect(view.getByText('1')).toBeDefined()
    expect(view.getByText('3')).toBeDefined()
    expect(view.getByText('6')).toBeDefined()
  })

  it('labels the current student score in their score band', () => {
    const { container } = render(
      <ScoreDistributionCard
        data={{
          subject: 'Science',
          bands: [
            { band: '61-80', count: 5 },
            { band: '81-100', count: 2 },
          ],
          user_band: '61-80',
          user_score: 76,
        }}
      />,
    )
    const view = within(container)

    expect(view.getByText('You: 76%')).toBeDefined()
  })

  it('renders a score distribution when the user has no matching band', () => {
    const { container } = render(
      <ScoreDistributionCard
        data={{
          subject: 'Physics',
          bands: [
            { band: '41-60', count: 4 },
            { band: '61-80', count: 7 },
          ],
          user_band: '',
          user_score: 55,
        }}
      />,
    )
    const view = within(container)

    expect(view.getByText('Cohort Score Distribution')).toBeDefined()
    expect(view.queryByText(/You:/)).toBeNull()
  })
})
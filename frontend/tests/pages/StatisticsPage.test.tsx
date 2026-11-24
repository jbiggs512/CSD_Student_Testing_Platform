import { cleanup, fireEvent, render, within, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StatisticsPage, GradesChartCard } from '@/pages/statistics'
import { cloneElement, type ReactElement } from 'react'
import { type GradesOverTimeResponse, buildResultsWorkbook } from '@/pages/statistics/model'

const { getCourseTitle } = vi.hoisted(() => ({
  getCourseTitle: vi.fn(),
}))

const {
  getStatisticsOverview,
  getGradesOverTime,
} = vi.hoisted(() => ({
  getStatisticsOverview: vi.fn(),
  getGradesOverTime: vi.fn(),
}))

const { exportResultsToExcel } = vi.hoisted(() => ({
  exportResultsToExcel: vi.fn(),
}))



vi.mock('@/pages/dashboard/api', () => ({
  getCourseTitle,
}))

vi.mock('@/pages/statistics/api', () => ({
  getStatisticsOverview,
  getGradesOverTime,
  StatisticsApiError: class StatisticsApiError extends Error { },
}))

vi.mock('@/pages/statistics/model', async () => {
  const actual = await vi.importActual<typeof import('@/pages/statistics/model')>(
    '@/pages/statistics/model',
  )
  return {
    ...actual,
    exportResultsToExcel,
  }
})

const mockStatistics = {
  total_points: 400,
  average_score: 75,
  best_score: {
    score: 140,
    test_name: 'First Test',
    completed_date: '2026-01-01',
  },
  worst_score: {
    score: 260,
    test_name: 'Second Test',
    completed_date: '2026-01-02',
  },
}

const mockGradesOverTime = {
  average: 75,
  points: [
    {
      completed_at: '2026-01-01T12:00:00.000Z',
      percentage: 60,
      test_name: 'First Test',
      is_best: false,
      is_worst: true,
    },
    {
      completed_at: '2026-01-02T12:00:00.000Z',
      percentage: 90,
      test_name: 'Second Test',
      is_best: true,
      is_worst: false,
    },
  ],
}

function renderStatisticsPage() {
  return render(
    <MemoryRouter>
      <StatisticsPage />
    </MemoryRouter>,
  )
}

describe('Statistics Page', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('shows a loading message while the statistics data is pending', () => {
    getCourseTitle.mockReturnValue(new Promise(() => undefined))
    getStatisticsOverview.mockReturnValue(new Promise(() => undefined))
    getGradesOverTime.mockReturnValue(new Promise(() => undefined))

    renderStatisticsPage()

    expect(screen.getByText('Statistics data is loading...')).toBeDefined()
  })

  it('loads statistics data and renders the page summary', async () => {
    getCourseTitle.mockResolvedValue('BSc Software Engineering')
    getStatisticsOverview.mockResolvedValue(mockStatistics)
    getGradesOverTime.mockResolvedValue(mockGradesOverTime)

    renderStatisticsPage()

    expect(await screen.findByRole('heading', { name: 'Statistics' })).toBeDefined()
    expect(screen.getByText('BSc Software Engineering')).toBeDefined()
    expect(screen.getByText('Total Points')).toBeDefined()
    expect(screen.getByText('400')).toBeDefined()
    expect(screen.getByText('75%')).toBeDefined()
    expect(screen.getAllByText('90%')).toBeDefined()
    expect(screen.getByText('First Test - 2026-01-01')).toBeDefined()
    expect(screen.getByText('Grades Over Time')).toBeDefined()
    expect(screen.getByText('Grades Over Time Breakdown')).toBeDefined()
  })

  it('exports the displayed grade data when Export Results is clicked', async () => {
    getCourseTitle.mockResolvedValue('BSc Software Engineering')
    getStatisticsOverview.mockResolvedValue(mockStatistics)
    getGradesOverTime.mockResolvedValue(mockGradesOverTime)
    exportResultsToExcel.mockResolvedValue(undefined)

    renderStatisticsPage()

    const exportButton = await screen.findByRole('button', { name: 'Export Results' })
    fireEvent.click(exportButton)

    await waitFor(() => {
      expect(exportResultsToExcel).toHaveBeenCalledWith(mockGradesOverTime.points)
    })
  })

  it('logs errors and stops showing the loading state when the data fails to load', async () => {
    const error = new Error('Something went wrong')
    getCourseTitle.mockRejectedValue(error)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    renderStatisticsPage()

    await waitFor(() => {
      expect(screen.queryByText('Loading statistics...')).toBeNull()
    })

    expect(consoleError).toHaveBeenCalledWith('Error loading statistics data:', error)
  })
})

// Mock responsive container, otherise it will render as 0x0
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

const data: GradesOverTimeResponse = {
  average: 82,
  points: [
    {
      completed_at: '2026-09-19T12:00:00Z',
      percentage: 76,
      test_name: 'A',
      is_best: false,
      is_worst: true,
    },
    {
      completed_at: '2026-09-26T12:00:00Z',
      percentage: 85,
      test_name: 'B',
      is_best: false,
      is_worst: false,
    },
    {
      completed_at: '2026-10-03T12:00:00Z',
      percentage: 80,
      test_name: 'C',
      is_best: false,
      is_worst: false,
    },
    {
      completed_at: '2026-10-10T12:00:00Z',
      percentage: 87,
      test_name: 'D',
      is_best: true,
      is_worst: false,
    },
  ],
}

function renderChart(chartData: GradesOverTimeResponse = data) {
  const { container } = render(<GradesChartCard data={chartData} />)
  return within(container)
}

describe('GradesChartCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the title', () => {
    const view = renderChart()
    expect(view.getByText('Grades Over Time')).toBeTruthy()
  })

  it('labels the best and worst points', () => {
    const view = renderChart()
    expect(view.getByText('87% · Best')).toBeTruthy()
    expect(view.getByText('76% · Worst')).toBeTruthy()
  })

  it('labels ordinary points with just the percentage', () => {
    const view = renderChart()
    expect(view.getByText('85%')).toBeTruthy()
    expect(view.getAllByText('80%')).toHaveLength(2)
  })

  it('shows the average reference line label', () => {
    const view = renderChart()
    expect(view.getByText('Average 82%')).toBeTruthy()
  })

  it('formats the x-axis dates', () => {
    const view = renderChart()
    expect(view.getByText('19 Sept')).toBeTruthy()
    expect(view.getByText('26 Sept')).toBeTruthy()
    expect(view.getByText('3 Oct')).toBeTruthy()
    expect(view.getByText('10 Oct')).toBeTruthy()
  })

  it('derives the y-axis range from the lowest grade', () => {
    const view = renderChart()
    expect(view.getByText('60%')).toBeTruthy()
    expect(view.getByText('100%')).toBeTruthy()
    expect(view.queryByText('50%')).toBeNull()
  })
})

describe('ExportResultsCard', () => {
  const fillOf = (cell: any) => cell.fill?.fgColor?.argb;
  const BEST = "FFF4B767";
  const WORST = "FFB44D70";

  it("writes a header and one row per point", async () => {
    const wb = buildResultsWorkbook([
      {
        "completed_at": "2026-11-03",
        "percentage": 80,
        "test_name": "A",
        "is_best": true,
        "is_worst": false
      },
      {
        "completed_at": "2026-11-13",
        "percentage": 70,
        "test_name": "B",
        "is_best": false,
        "is_worst": true
      },
    ]);
    const sheet = wb.getWorksheet("Results")!;

    expect(sheet.getRow(1).values).toEqual([undefined, "Test", "Date", "Grade"]);
    expect(sheet.getRow(2).getCell(1).value).toBe("A");
    expect(sheet.getRow(3).getCell(3).value).toBe(70);
  });

  it("highlights the best green and the worst red", async () => {
    const wb = buildResultsWorkbook([
      {
        "completed_at": "2026-11-03",
        "percentage": 90,
        "test_name": "Best",
        "is_best": true,
        "is_worst": false
      },
      {
        "completed_at": "2026-11-04",
        "percentage": 60,
        "test_name": "Middle",
        "is_best": false,
        "is_worst": false
      },
      {
        "completed_at": "2026-11-05",
        "percentage": 20,
        "test_name": "Worst",
        "is_best": false,
        "is_worst": true
      }
    ]);
    const sheet = wb.getWorksheet("Results")!;

    expect(fillOf(sheet.getRow(2).getCell(3))).toBe(BEST);
    expect(fillOf(sheet.getRow(3).getCell(3))).toBeUndefined();
    expect(fillOf(sheet.getRow(4).getCell(3))).toBe(WORST);
  });
})

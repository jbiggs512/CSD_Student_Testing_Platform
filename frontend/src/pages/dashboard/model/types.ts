export interface OutstandingTest {
    id: number
    test_name: string
    subject_name: string
    description: string
    questions_per_attempt: number
}

export interface CompletedTest {
    id: number
    test_name: string
    score_percentage: number
    questions_correct: number
    questions_total: number
    completed_date: string
    score_points: number
}

export interface CohortRank {
    rank: number
    size: number
}

export interface DashboardContentProps {
  readonly outstandingTests?: OutstandingTest[]; 
  readonly completedTests?: CompletedTest[];
  readonly cohortRank?: CohortRank;
  readonly courseTitle: string;
}
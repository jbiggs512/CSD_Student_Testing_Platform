export interface OutstandingTest {
    id: number
    testName: string
    subjectName: string
    description: string
    questionsPerAttempt: number
}

export interface CompletedTest {
    id: number
    testName: string
    scorePercentage: number
    questionsCorrect: number
    questionsTotal: number
    completedDate: string
    scorePoints: number
}

export interface CohortRank {
    rank: number
    size: number
}

export interface DashboardContentProps {
  readonly outstandingTests?: OutstandingTest[]; 
  readonly completedTests?: CompletedTest[];
  readonly cohortRank?: CohortRank;
}
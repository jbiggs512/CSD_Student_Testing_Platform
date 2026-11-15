export interface ScoreResponse{
    score: number;
    test_name: string;
    completed_date: string;
}

export interface StatisticsResponse{
    total_points: number;
    average_score: number;
    best_score: ScoreResponse;
    worst_score: ScoreResponse;
}

export interface StatisticsProps {
    courseTitle: string;
    statistics: StatisticsResponse | undefined;
    gradesOverTime: GradesOverTimeResponse;
}

export type GradePoint = {
  completed_at: string;
  percentage: number;
  test_name: string;
  is_best: boolean;
  is_worst: boolean;
}

export type GradesOverTimeResponse = {
  average: number;
  points: GradePoint[];
}
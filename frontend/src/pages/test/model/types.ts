export interface Option {
  readonly option_id: number;
  readonly option_text: string;
  readonly is_correct: boolean;
  selected: boolean;
}

export interface Question {
  readonly question_id: number;
  readonly question_text: string;
  readonly options: Option[];
}

export interface TestDetails {
  readonly test_id?: number;
  readonly course: string; 
  readonly subject: string;
  readonly test_name: string;
  readonly description: string;
  readonly timed: boolean;
  readonly time_limit_minutes: number; 
  readonly current_question: number;
  readonly questions_per_attempt: number;
  readonly questions: Question[]; 
}

export interface TestPageContentProps {
  readonly testDetails: TestDetails;
  readonly onSelectOption: (question_id: number, option_id: number) => void;
  readonly onNavigateQuestion: (question_number: number) => void;
  readonly isAnswered: (question_id: number) => boolean;
  readonly onSubmit?: () => void | Promise<void>;
  readonly isSubmitting?: boolean;
  readonly submitError?: string | null;
}

export interface TestAttemptRequest {
  test_id: number;
  started_at: string;
  completed_at: string;
  score: number;
  total_questions: number;
  correct_questions: number;
}

export interface TestAttempt {
  attempt_id: number;
  test_id: number;
  started_at: string;
  completed_at: string;
  score: number;
  total_questions: number;
  correct_questions: number;
}

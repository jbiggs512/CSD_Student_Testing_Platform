export interface Option {
  readonly option_id: number;
  readonly option_text: string;
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
  readonly testAttempt: TestAttempt;
  readonly onSelectOption: (question_id: number, option_id: number) => void;
  readonly onNavigateQuestion: (question_id: number) => void;
  readonly isAnswered: (question_id: number) => boolean;
  readonly onSubmit?: () => void | Promise<void>;
  readonly isSubmitting?: boolean;
  readonly submitError?: string | null;
}

export interface TestAnswerSubmission {
  question_id: number;
  selected_option_id: number | null;
}

export interface TestAttemptCreateRequest {
  test_id: number;
}

export interface TestCompletedRequest {
  attempt_id: number;
  test_id: number;  
  answers: TestAnswerSubmission[];
}

export interface TestAttempt {
  attempt_id: number;
  test_id: number;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  total_questions: number | null;
  correct_questions: number | null;
}

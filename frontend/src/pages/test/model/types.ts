export interface Option {
  readonly optionId: number;
  readonly optionText: string;
  readonly isCorrect: boolean;
  selected: boolean;
}

export interface Question {
  readonly questionId: number;
  readonly questionText: string;
  readonly options: Option[];
}

export interface TestDetails {
  readonly testId?: number;
  readonly course: string; 
  readonly subject: string;
  readonly testName: string;
  readonly description: string;
  readonly timed: boolean;
  readonly timeLimitMinutes: number; 
  readonly currentQuestion: number;
  readonly questionsPerAttempt: number;
  readonly questions: Question[]; 
}

export interface TestPageContentProps {
  readonly testDetails: TestDetails;
  readonly onSelectOption: (questionId: number, optionId: number) => void;
  readonly onNavigateQuestion: (questionNumber: number) => void;
  readonly isAnswered: (questionId: number) => boolean;
  readonly onSubmit?: () => void | Promise<void>;
  readonly isSubmitting?: boolean;
  readonly submitError?: string | null;
}

export interface TestAttemptRequest {
  testId: number;
  startedAt: string;
  completedAt: string;
  score: number;
  totalQuestions: number;
}

export interface TestAttempt {
  attemptId: number;
  testId: number;
  startedAt: string;
  completedAt: string;
  score: number;
  totalQuestions: number;
}

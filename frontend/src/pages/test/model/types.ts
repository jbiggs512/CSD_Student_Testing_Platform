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
  readonly course: string; 
  readonly subject: string;
  readonly testName: string;
  readonly description: string;
  readonly timed: boolean;
  readonly timeLimit: number; 
  readonly currentQuestion: number;
  readonly totalQuestions: number;
  readonly questions: Question[]; 
}

export interface TestPageContentProps {
  readonly testDetails: TestDetails;
  readonly onSelectOption: (questionId: number, optionId: number) => void;
  readonly onNavigateQuestion: (questionNumber: number) => void;
  readonly isAnswered: (questionId: number) => boolean;
}

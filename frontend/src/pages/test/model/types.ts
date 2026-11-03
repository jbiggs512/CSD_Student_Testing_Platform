export interface Option {
  readonly id: string;
  readonly text: string;
  selected: boolean;
}

export interface Question {
  readonly id: number;
  readonly text: string;
  readonly options: Option[];
}

export interface TestDetails {
  readonly course: string; 
  readonly subject: string;
  readonly testName: string;
  readonly timed: boolean;
  readonly time: number; 
  readonly currentQuestion: number;
  readonly totalQuestions: number;
  readonly questions: Question[]; 
}

export interface TestPageContentProps {
  readonly testDetails: TestDetails;
  readonly onSelectOption: (questionId: number, optionId: string) => void;
  readonly onNavigateQuestion: (questionNumber: number) => void;
  readonly isAnswered: (questionId: number) => boolean;
}

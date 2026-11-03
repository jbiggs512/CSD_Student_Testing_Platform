import { useState, useEffect } from 'react';
import { TestPageContent } from "./TestPageContent";
// import { useParams } from 'react-router';
import { type TestDetails } from '../model';
import { getTestDetails } from '../api';

export function TestPage() {
  // Extract the test ID from the URL parameters using useParams
  // const { id } = useParams(); TODO: Uncomment this line when using dynamic routing to fetch test details based on the test ID
  const [testDetails, setTestDetails] = useState<TestDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Handle option selection for a question
  const handleSelectOption = (questionId: number, optionId: number) => {
    if (!testDetails) return;
    testDetails?.questions.forEach((question) => {
      if (question.questionId === questionId) {
        question.options.forEach((option) => {
          option.selected = option.optionId === optionId;
        });
      }
    })

    setTestDetails({ ...testDetails! }); // Re-render with the updated state
  };

  // Handle navigation to a specific question by its number
  const handleNavigateQuestion = (questionNumber: number) => {
    if (!testDetails) return;
    if (questionNumber >= 1 && questionNumber <= testDetails.totalQuestions) {
      setTestDetails({ ...testDetails, currentQuestion: questionNumber }); // Re-render with the updated current question
    }
  };

  // Check if a question has been answered
  const isAnswered = (questionId: number) => {
    if (!testDetails) return false;
    const question = testDetails?.questions.find(q => q.questionId === questionId);
    return question ? question.options.some(option => option.selected) : false;
  }

  useEffect(() => {
    function loadData() {
      try {
        // Fetch all data needed for the test
        // setTestDetails(getTestDetails(id?.toString() || "")); TODO: Uncomment this line when using dynamic routing to fetch test details based on the test ID
        setTestDetails(getTestDetails());
      }
      catch (error) {
        console.error("Error loading test data:", error);
      }
      finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading test...</div>;
  }

  return (
    <TestPageContent testDetails={testDetails!}
      onSelectOption={handleSelectOption}
      onNavigateQuestion={handleNavigateQuestion}
      isAnswered={isAnswered} />
  );
}

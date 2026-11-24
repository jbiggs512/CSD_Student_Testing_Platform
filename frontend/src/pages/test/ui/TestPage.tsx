import { useState, useEffect } from 'react';
import { TestPageContent } from "./TestPageContent";
import { useNavigate, useParams } from 'react-router';
import {
  type TestAnswerSubmission,
  type TestDetails,
  type TestAttemptRequest,
} from '../model';
import { getTestDetails, createTestAttempt } from '../api';
import { toast } from '@/shared/components';

export function TestPage() {
  const navigate = useNavigate();
  // Extract the test ID from the URL parameters using useParams
  const { id } = useParams();
  const [testDetails, setTestDetails] = useState<TestDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startedAt] = useState(() => new Date().toISOString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Handle option selection for a question
  const handleSelectOption = (question_id: number, option_id: number) => {
    if (!testDetails) return;
    testDetails?.questions.forEach((question) => {
      if (question.question_id === question_id) {
        question.options.forEach((option) => {
          option.selected = option.option_id === option_id;
        });
      }
    })

    setTestDetails({ ...testDetails! }); // Re-render with the updated state
  };

  // Handle navigation to a specific question by its id
  const handleNavigateQuestion = (questionId: number) => {
    if (!testDetails) return;
    setTestDetails({ ...testDetails, current_question: questionId }); // Re-render with the updated current question
  };

  // Check if a question has been answered
  const isAnswered = (question_id: number) => {
    if (!testDetails) return false;
    const question = testDetails?.questions.find(q => q.question_id === question_id);
    return question ? question.options.some(option => option.selected) : false;
  }

  // Handles submission of the test
  const handleSubmit = async () => {
    if (!testDetails || isSubmitting) return;

    const answers: TestAnswerSubmission[] = testDetails.questions.map((question) => {
      const selectedOption = question.options.find((option) => option.selected);
      return {
        question_id: question.question_id,
        selected_option_id: selectedOption ? selectedOption.option_id : null,
      };
    });

    const request: TestAttemptRequest = {
      test_id: testDetails.test_id ?? Number.parseInt(id ?? '0'),
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      answers,
    };

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await createTestAttempt(request);
      if (result == undefined) {
        throw new Error("Test attempt was not submitted. Please try again.");
      }
      else {
        // Add toast to page to display success to user
        toast.add({
          type: "success",
          title: "Test results saved!",
          description: `You achieved ${result.score} points`,
        })
        // Navigate student back to dashboard
        void navigate('/dashboard');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit the test. Please try again.';
      setSubmitError(message);
      console.error('Error submitting test:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch all data needed for the test
        const testDetails = await getTestDetails(id ? Number.parseInt(id) : 0);
        if (testDetails == undefined) {
          throw new Error("Test details were not returned from the API");
        }
        else if (testDetails.questions.length > 0) {
          // Set the current question id to the first in the list
          const firstQ = testDetails.questions[0].question_id
          setTestDetails({ ...testDetails, current_question: firstQ })
        }
      }
      catch (error) {
        console.error("Error loading test data:", error);
        void navigate('/dashboard'); // Navigate to the dashboard if there's an error fetching test details
      }
      finally {
        setIsLoading(false);
      }
    }

    loadData().catch((error) => {
      console.error("Failed to load test data:", error);
    });;
  }, []);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading test...</div>;
  }

  if (!testDetails) {
    return null;
  }

  return (
    <TestPageContent testDetails={testDetails!}
      onSelectOption={handleSelectOption}
      onNavigateQuestion={handleNavigateQuestion}
      isAnswered={isAnswered}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitError={submitError} />
  );
}

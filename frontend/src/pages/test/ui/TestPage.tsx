import { useState, useEffect } from 'react';
import { TestPageContent } from "./TestPageContent";
import { useNavigate, useParams } from 'react-router';
import { type TestDetails, type TestAttemptRequest } from '../model';
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

  // Handle navigation to a specific question by its number
  const handleNavigateQuestion = (questionNumber: number) => {
    if (!testDetails) return;
    if (questionNumber >= 1 && questionNumber <= testDetails.questions_per_attempt) {
      setTestDetails({ ...testDetails, current_question: questionNumber }); // Re-render with the updated current question
    }
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

    // Calculate the score based on the users answers
    // +30 for a correct answer
    // -10 for an incorrect answer
    // 0 for no answer
    const score = testDetails.questions.reduce((total, question) => {
      const selectedOption = question.options.find(option => option.selected);
      if (!selectedOption) return total;
      return total + (selectedOption.is_correct ? 30 : -10);
    }, 0);

    const request: TestAttemptRequest = {
      test_id: testDetails.test_id ?? Number.parseInt(id ?? '0'),
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      score: score,
      total_questions: testDetails.questions_per_attempt,
    };

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await createTestAttempt(request);
      // Add toast to page to display success to user
      toast.add({
        type: "success",
        title: "Test results saved!",
        description: `You achieved ${score} points`,
      })
      // Navigate student back to dashboard
      navigate('/dashboard');
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
        setTestDetails(testDetails);
      }
      catch (error) {
        console.error("Error loading test data:", error);
        navigate('/dashboard'); // Navigate to the dashboard if there's an error fetching test details
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

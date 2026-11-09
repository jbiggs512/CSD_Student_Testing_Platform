import { useState, useEffect } from 'react';
import { DashboardContent } from './DashboardContent';
import { getCompletedTests, getOutstandingTests, getCohortRank } from '../api';
import type { OutstandingTest, CompletedTest, CohortRank } from "../model"
import { getCurrentUser } from '@/shared/api';

export function DashboardPage() {
  const [completedTests, setCompletedTests] = useState<CompletedTest[]>([]);
  const [outstandingTests, setOutstandingTests] = useState<OutstandingTest[]>([]);
  const [cohortRank, setCohortRank] = useState<CohortRank>({ rank: 0, size: 0 });
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    async function loadData() {
      try {
        // Get authenticated user id
        const userId = getCurrentUser()?.user_id ?? 0;

        // Fetch all data needed for the dashboard with proper awaits
        const completed = getCompletedTests();
        setCompletedTests(completed);

        const outstanding = await getOutstandingTests(userId);
        setOutstandingTests(outstanding);

        const rank = getCohortRank();
        setCohortRank(rank);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData().catch((error) => {
      console.error("Failed to load test data:", error);
    });
  }, []);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading dashboard...</div>;
  }

  return (
    <DashboardContent
      completedTests={completedTests}
      outstandingTests={outstandingTests}
      cohortRank={cohortRank}
    />
  );
}
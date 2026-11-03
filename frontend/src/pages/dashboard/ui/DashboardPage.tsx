import { useState, useEffect } from 'react';
import { DashboardContent } from './DashboardContent';
import { getCompletedTests, getOutstandingTests, getCohortRank } from '../api';
import type { OutstandingTest, CompletedTest, CohortRank } from "../model"

export function DashboardPage() {
  const [completedTests, setCompletedTests] = useState<CompletedTest[]>([]);
  const [outstandingTests, setOutstandingTests] = useState<OutstandingTest[]>([]);
  const [cohortRank, setCohortRank] = useState<CohortRank>({ rank: 0, size: 0 });
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    function loadData() {
      try {
        // Fetch all data needed for the dashboard 
        setCompletedTests(getCompletedTests());
        setOutstandingTests(getOutstandingTests());
        setCohortRank(getCohortRank());
      }
      catch (error) {
        console.error("Error loading dashboard data:", error);
      }
      finally {
        setIsLoading(false);
      }
    }

    loadData();
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
import { useState, useEffect } from 'react';
import { DashboardContent, LoadingDashboardContent } from './DashboardContent';
import { getCompletedTests, getOutstandingTests, getCohortRank, getCourseTitle } from '../api';
import type { OutstandingTest, CompletedTest, CohortRank } from "../model"

export function DashboardPage() {
  const [completedTests, setCompletedTests] = useState<CompletedTest[]>([]);
  const [outstandingTests, setOutstandingTests] = useState<OutstandingTest[]>([]);
  const [cohortRank, setCohortRank] = useState<CohortRank>({ rank: 0, size: 0 });
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    async function loadData() {
      try {
        // Fetch all data needed for the dashboard with awaits
        const completed = await getCompletedTests();
        if (completed != undefined) setCompletedTests(completed);

        const outstanding = await getOutstandingTests();
        if (outstanding != undefined)setOutstandingTests(outstanding);

        const rank = await getCohortRank();
        if (rank != undefined)setCohortRank(rank);

        const course = await getCourseTitle();
        if (course != undefined)setCourseTitle(course);
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

  if (isLoading) return <LoadingDashboardContent />

  return (
    <DashboardContent
      outstandingTests={outstandingTests} 
      completedTests={completedTests} 
      cohortRank={cohortRank}
      courseTitle={courseTitle}
    />
  );
}
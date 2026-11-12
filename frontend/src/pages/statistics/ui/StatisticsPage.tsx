import { useState, useEffect } from 'react';
import { StatisticsContent } from "./StatisticsContent";
import { getCourseTitle } from '@/pages/dashboard/api';

export function StatisticsPage() {
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    async function loadData() {
      try {
        // Fetch all data needed for the statistics with awaits
        const course = await getCourseTitle();
        setCourseTitle(course);

      } catch (error) {
        console.error("Error loading statistics data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData().catch((error) => {
      console.error("Failed to load statistics data:", error);
    });
  }, []);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading statistics...</div>;
  }

  return (
    <StatisticsContent courseTitle={courseTitle} />
  );
}
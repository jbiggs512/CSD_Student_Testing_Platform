import { useState, useEffect } from 'react';
import { StatisticsContent } from "./StatisticsContent";
import { getCourseTitle } from '@/pages/dashboard/api';
import { getGradesOverTime, getStatisticsOverview } from '../api';
import type { GradesOverTimeResponse, StatisticsResponse } from "../model" 

const DEFAULT_GRADES: GradesOverTimeResponse = {
    average: 0,
    points: []
};

export function StatisticsPage() {
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [statistics, setStatistics] = useState<StatisticsResponse>();
  const [gradesOverTime, setGradesOverTime] = useState<GradesOverTimeResponse>();
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    async function loadData() {
      try {
        // Fetch all data needed for the statistics with awaits
        const course = await getCourseTitle();
        setCourseTitle(course);

        const stats = await getStatisticsOverview();
        setStatistics(stats);

        const grades = await getGradesOverTime();
        setGradesOverTime(grades);

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
    <StatisticsContent courseTitle={courseTitle} 
    statistics={statistics} 
    gradesOverTime={gradesOverTime ?? DEFAULT_GRADES} />
  );
}
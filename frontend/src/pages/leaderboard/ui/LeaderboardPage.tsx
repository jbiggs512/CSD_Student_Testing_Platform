import { useState, useEffect } from 'react';
import { LeaderboardContent } from "./LeaderboardContent";
import { getCourseTitle, getSubjects, getLeaderboard } from '../api';
import {
    type LeaderboardEntry,
    type LeaderboardResponse,
    type SubjectFilter
} from "../model"

const DEFAULT_CURRENT_USER: LeaderboardEntry = {
    user_id: 0,
    rank: 0,
    name: "",
    avg_score: 0,
    points: 0,
};

export function LeaderboardPage() {
    const [courseTitle, setCourseTitle] = useState<string>("");
    const [subjects, setSubjects] = useState<SubjectFilter[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardResponse>();
    const [isLoading, setIsLoading] = useState(true);


    useEffect(() => {
        async function loadData() {
            try {
                // Fetch all data needed for the leaderboard with awaits
                const course = await getCourseTitle();
                setCourseTitle(course);

                const subjectList = await getSubjects();
                setSubjects(subjectList);

                // Only get leaderboard data if subjects are returned
                if (subjectList.length > 0) {
                    const leaderboard = await getLeaderboard(subjectList[0].value);
                    setLeaderboard(leaderboard);
                }
            } catch (error) {
                console.error("Error loading leaderboard data:", error);
            } finally {
                setIsLoading(false);
            }
        }

        loadData().catch((error) => {
            console.error("Failed to load test data:", error);
        });
    }, []);

    if (isLoading) {
        return <div className="flex min-h-screen items-center justify-center">Loading leaderboard...</div>;
    }

    return (
        <LeaderboardContent
            courseTitle={courseTitle}
            subjects={subjects}
            topFive={leaderboard?.top_students ?? []}
            currentUser={leaderboard?.current_user_entry ?? DEFAULT_CURRENT_USER}
            userInTop5={leaderboard?.is_in_top_5 ?? false}
        />
    )
}
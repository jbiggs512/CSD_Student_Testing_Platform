import { useState, useEffect } from 'react';
import { LeaderboardContent } from "./LeaderboardContent";
import { getCourseTitle, getSubjects, getLeaderboard } from '../api';
import {
    type LeaderboardEntry,
    type LeaderboardResponse,
    type SubjectFilter
} from "../model"

const DEFAULT_TOP_FIVE: LeaderboardEntry[] = [
    { user_id: 2, rank: 1, name: "John D.", avg_score: 96, points: 1860 },
    { user_id: 3, rank: 2, name: "Jane D.", avg_score: 93, points: 1820 },
    { user_id: 4, rank: 3, name: "Bob S.", avg_score: 92, points: 1780 },
    { user_id: 5, rank: 4, name: "Joe B.", avg_score: 89, points: 1640 },
    { user_id: 6, rank: 5, name: "Dave A.", avg_score: 88, points: 1600 },
];

const DEFAULT_CURRENT_USER: LeaderboardEntry = {
    user_id: 1,
    rank: 12,
    name: "You",
    avg_score: 83,
    points: 1410,
};

export const DEFAULT_SUBJECT: SubjectFilter[] = [
    { label: "Software", value: 0 },
    { label: "Mathematics", value: 1 },
    { label: "Science", value: 2 },
]


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
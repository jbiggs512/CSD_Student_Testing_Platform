export interface LeaderboardEntry {
    rank: number;
    name: string;
    avgScore: number;
    points: number;
}
export interface LeaderboardProps {
    courseTitle?: string;
    subjects?: string[];
    initialSubject?: string;
    topFive?: LeaderboardEntry[];
    currentUser?: LeaderboardEntry;
}

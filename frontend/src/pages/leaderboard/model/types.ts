export interface LeaderboardEntry {
    user_id: number;
    rank: number;
    name: string;
    avg_score: number;
    points: number;
}

export interface LeaderboardResponse {
    top_students: LeaderboardEntry[];
    current_user_entry: LeaderboardEntry | undefined;
    is_in_top_5: boolean;
}

export interface SubjectFilter{
    label: string;
    value: number;
}

export interface LeaderboardProps {
    courseTitle: string;
    subjects: SubjectFilter[];
    topFive: LeaderboardEntry[];
    currentUser: LeaderboardEntry;
    userInTop5: boolean;
}

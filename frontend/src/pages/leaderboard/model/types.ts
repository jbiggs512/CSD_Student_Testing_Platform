export interface LeaderboardEntry {
    rank: number;
    name: string;
    avgScore: number;
    points: number;
}

export interface SubjectFilter{
    label: string;
    value: number;
}

export interface LeaderboardProps {
    courseTitle: string;
    subjects: SubjectFilter[];
    initialSubject: string;
    topFive: LeaderboardEntry[];
    currentUser: LeaderboardEntry;
}

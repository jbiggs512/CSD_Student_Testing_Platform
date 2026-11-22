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

export interface SubjectFilter {
    label: string;
    value: number;
}

export interface LeaderboardProps {
    pageError: string | null;
    courseTitle: string;
    subjects: SubjectFilter[];
    selectedSubjectId: number;
    onSubjectChange: (subjectId: number) => void;
    topFive: LeaderboardEntry[];
    currentUser: LeaderboardEntry;
    userInTop5: boolean;
    cohortComparison: CohortComparisonResponse | undefined;
    scoreDistribution: ScoreDistributionResponse | undefined;
}

export interface EmptyLeaderboardProps {
    pageError: string | null;
    courseTitle: string;
    subjects: SubjectFilter[];
    selectedSubjectId: number;
    onSubjectChange: (subjectId: number) => void; 
}

export interface TopStudentCardProps {
    subjects: SubjectFilter[];
    selectedSubjectId: number; 
    topFive: LeaderboardEntry[];
    currentUser: LeaderboardEntry;
    userInTop5: boolean;
}

export interface ScoreBand {
    band: string;
    count: number;
};

export interface ScoreDistributionResponse {
    subject: string;
    bands: ScoreBand[];
    user_band: string;
    user_score: number;
};

export interface CohortComparisonResponse {
    subject: string;
    top5_average: number;
    user_average: number;
    cohort_average: number;
};

export interface ComparisonRow {
    key: "top5" | "you" | "cohort";
    label: string;
    value: number;
    fill: string
};

export interface SelectSubjectProps {
    subjects: SubjectFilter[];
    selectedSubjectId: number;
    onSubjectChange: (subjectId: number) => void;
};
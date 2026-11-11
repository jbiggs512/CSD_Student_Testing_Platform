import { LeaderboardContent } from "./LeaderboardContent";
import {
    type LeaderboardEntry,
    type SubjectFilter
} from "../model"

const DEFAULT_TOP_FIVE: LeaderboardEntry[] = [
    { rank: 1, name: "John D.", avgScore: 96, points: 1860 },
    { rank: 2, name: "Jane D.", avgScore: 93, points: 1820 },
    { rank: 3, name: "Bob S.", avgScore: 92, points: 1780 },
    { rank: 4, name: "Joe B.", avgScore: 89, points: 1640 },
    { rank: 5, name: "Dave A.", avgScore: 88, points: 1600 },
];

const DEFAULT_CURRENT_USER: LeaderboardEntry = {
    rank: 12,
    name: "You",
    avgScore: 83,
    points: 1410,
};

export const DEFAULT_SUBJECT: SubjectFilter[] = [
    { label: "Software", value: 0 },
    { label: "Mathematics", value: 1 },
    { label: "Science", value: 2 },
]


export function LeaderboardPage() {
    return (
        <LeaderboardContent
        courseTitle=""
        subjects={DEFAULT_SUBJECT}
        initialSubject="Software"
        topFive={DEFAULT_TOP_FIVE}
        currentUser={DEFAULT_CURRENT_USER}
        />
    )
}
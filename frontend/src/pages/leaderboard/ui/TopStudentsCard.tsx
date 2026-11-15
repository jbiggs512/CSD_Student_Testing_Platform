import {
    Badge,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/shared/components";
import type { TopStudentCardProps, LeaderboardEntry } from "../model"
import { getCurrentUser } from '@shared/api';

// Row + badge styling for the podium positions
const PODIUM: Record<number, { row: string; badge: string }> = {
    1: { row: "bg-[#F4B767]/35", badge: "bg-[#F4B767] text-navy" },
    2: { row: "bg-navy/20", badge: "bg-navy/25 text-navy" },
    3: { row: "bg-[#E37C67]/35", badge: "bg-[#E37C67]/60 text-navy" },
};

function RankBadge({ rank, className }: Readonly<{ rank: number; className: string; }>) {
    return (
        <span className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold ${className}`} >
            {rank}
        </span>
    );
}

function LeaderboardRow({ entry }: Readonly<{ entry: LeaderboardEntry }>) {
    const podium = PODIUM[entry.rank];
    const currentUser = getCurrentUser();
    return (
        <li className={`grid grid-cols-[3rem_1fr_4.5rem_4.5rem] items-center rounded-lg px-3 py-3 text-sm text-navy ${podium ? podium.row : "border border-navy/15 bg-white"}`} >
            <RankBadge
                rank={entry.rank}
                className={`${podium ? podium.badge : "bg-white border border-navy"}`}
            />
            <span className="flex items-center gap-3">
                <span className="font-semibold">{entry.name}</span>
                {/* Show your position badge if current user */}
                {currentUser?.user_id == entry.user_id && (
                    <Badge className="rounded-full bg-pink px-3 text-white hover:bg-pink">
                        Your position
                    </Badge>
                )}
            </span>
            <span className="text-right">{entry.avg_score}%</span>
            <span className="text-right">{entry.points}</span>
        </li>
    );
}

function CurrentUserRow({ user }: Readonly<{ user: LeaderboardEntry }>) {
    return (
        <li className="grid grid-cols-[3rem_1fr_4.5rem_4.5rem] items-center rounded-lg border border-navy bg-white px-3 py-3 text-sm text-navy">
            <RankBadge rank={user.rank} className="bg-navy text-white" />
            <span className="flex items-center gap-3">
                <span className="font-semibold">{user.name}</span>
                <Badge className="rounded-full bg-pink px-3 text-white hover:bg-pink">
                    Your position
                </Badge>
            </span>
            <span className="text-right">{user.avg_score}%</span>
            <span className="text-right">{user.points}</span>
        </li>
    );
}


export function TopStudentsCard(props: Readonly<TopStudentCardProps>) {
    const subject = props.subjects[0];

    return (
        <Card className="gap-0 border-0 py-0 shadow-md">
            <CardHeader className="gap-1 border-b py-5">
                <CardTitle>
                    <div className="mb-1 flex items-centre justify-between">
                        <h2 className="font-heading text-2xl font-bold text-plum">Top 5 Students</h2>
                        {/* Only show dropdowns if there are multiple subjects */}
                        {props.subjects.length > 0 && (
                            <div className="flex gap-4">
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="subjectFilter" className="text-xs font-medium text-muted-foreground">Subject</label>
                                    <Select id="subjectFilter" items={props.subjects} defaultValue={props.subjects[0]}>
                                        <SelectTrigger className="h-8 w-[200px] bg-background"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                        <SelectContent>
                                            {props.subjects.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="p-4"> 
                <div className="grid grid-cols-[3rem_1fr_4.5rem_4.5rem] px-3 pb-1 text-xs text-navy" aria-hidden="true" >
                    <span className="text-center">RANK</span>
                    <span>STUDENT</span>
                    <span className="text-right">AVG. SCORE</span>
                    <span className="text-right">POINTS</span>
                </div>

                <ol className="space-y-2" aria-label={`Top 5 students in ${subject.label}`}>
                    {props.topFive.map((entry) => (
                        <LeaderboardRow key={entry.rank} entry={entry} />
                    ))}
                </ol>

                {/* Display users position if they are not in the top 5 */}
                {!props.userInTop5 && (
                    <>
                        <div className="flex justify-center gap-1 py-2" aria-hidden="true">
                            {[0, 1, 2].map((i) => (
                                <span key={i} className="size-1.5 rounded-full bg-navy" />
                            ))}
                        </div>
                        <ol>
                            <CurrentUserRow user={props.currentUser} />
                        </ol>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
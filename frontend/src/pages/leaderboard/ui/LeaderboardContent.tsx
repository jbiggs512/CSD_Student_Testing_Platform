import {
    Badge,
    Card,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/shared/components'

import {
    type LeaderboardProps,
    type LeaderboardEntry
} from "../model"


// Row + badge styling for the podium positions
const PODIUM: Record<number, { row: string; badge: string }> = {
    1: { row: "bg-[#F4B767]/35", badge: "bg-[#F4B767] text-navy" },
    2: { row: "bg-navy/20", badge: "bg-navy/25 text-navy" },
    3: { row: "bg-[#E37C67]/35", badge: "bg-[#E37C67]/60 text-navy" },
};

function RankBadge({
    rank,
    className,
}: {
    rank: number;
    className: string;
}) {
    return (
        <span className={`flex size-8 items-center justify-center rounded-full border border-navy text-sm font-semibold ${className}`} >
            {rank}
        </span>
    );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
    const podium = PODIUM[entry.rank];
    return (
        <li className={`grid grid-cols-[3rem_1fr_4.5rem_4.5rem] items-center rounded-lg px-3 py-3 text-sm text-navy ${podium ? podium.row : "border border-navy/15 bg-white"}`} >
            <RankBadge
                rank={entry.rank}
                className={`${podium ? podium.badge : "bg-white"}`}
            />
            <span>{entry.name}</span>
            <span className="text-right">{entry.avgScore}%</span>
            <span className="text-right">{entry.points}</span>
        </li>
    );
}

function CurrentUserRow({ user }: { user: LeaderboardEntry }) {
    return (
        <li className="grid grid-cols-[3rem_1fr_4.5rem_4.5rem] items-center rounded-lg border border-navy bg-white px-3 py-3 text-sm text-navy">
            <RankBadge rank={user.rank} className="bg-navy text-white" />
            <span className="flex items-center gap-3">
                <span className="font-semibold">{user.name}</span>
                <Badge className="rounded-full bg-pink px-3 text-white hover:bg-pink">
                    Your position
                </Badge>
            </span>
            <span className="text-right">{user.avgScore}%</span>
            <span className="text-right">{user.points}</span>
        </li>
    );
}

export function LeaderboardContent(props: LeaderboardProps) {
    const subject = props.initialSubject;
    const userInTopFive = props.topFive.some((s) => s.rank === props.currentUser.rank);

    return (
        <main id="leaderboard-page" className="p-4">

            {/* Hero Section */}
            <section className="mb-8 flex flex-col justify-between rounded-2xl bg-navy p-10 text-white shadow-md lg:flex-row">
                <div className="mb-6 flex flex-col justify-center lg:mb-0">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">{props.courseTitle}</p>
                    <h1 className="mb-2 font-heading text-4xl font-bold tracking-tight text-white">Leaderboards</h1>
                    <p className="text-sm text-white/80">See how you rank against other students in your cohort.</p>
                </div>
            </section>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

                {/* Podium Results */}
                <div className="lg:col-span-3">
                    <Card className="p-6 shadow-sm">
                        <div className="mb-1 flex items-centre justify-between">
                            <h3 className="text-3xl font-bold text-navy py-4">Top 5 Students</h3>
                            {/* Only show dropdowns if there are multiple subjects */}
                            {props.subjects.length > 0 && (
                                <div className="flex gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label htmlFor="subjectFilter" className="text-xs font-medium text-muted-foreground">Subject</label>
                                        <Select id="subjectFilter" items={props.subjects}>
                                            <SelectTrigger className="h-8 w-[160px] bg-background"><SelectValue placeholder="Select Subject" /></SelectTrigger>
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
                        <div className="grid grid-cols-[3rem_1fr_4.5rem_4.5rem] px-3 pb-1 text-xs text-navy" aria-hidden="true" >
                            <span className="text-center">RANK</span>
                            <span>STUDENT</span>
                            <span className="text-right">AVG. SCORE</span>
                            <span className="text-right">POINTS</span>
                        </div>

                        <ol className="space-y-2" aria-label={`Top 5 students in ${subject}`}>
                            {props.topFive.map((entry) => (
                                <LeaderboardRow key={entry.rank} entry={entry} />
                            ))}
                        </ol>

                        {/* Display users position if they are not in the top 5 */}
                        {!userInTopFive && (
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
                    </Card>
                </div>

                {/* Progress Charts */}
                <div className="lg:col-span-2">
                    <Card className="p-6 shadow-sm">
                        <div className="mb-6 flex items-centre justify-between">
                            <h3 className="text-3xl font-bold text-navy py-4">You vs Cohort vs Top 5</h3>
                        </div>
                    </Card>
                    <Card className="p-6 shadow-sm mt-4">
                        <div className="mb-6 flex items-centre justify-between">
                            <h3 className="text-3xl font-bold text-navy py-4">Cohort Score Distribution</h3>
                        </div>
                    </Card>
                </div>
            </div>
        </main>
    );
}
import type { LeaderboardProps } from "../model"
import { TopStudentsCard } from './TopStudentsCard';
import { ComparisonCard } from './ComparisonCard';
import { ScoreDistributionCard } from './ScoreDistributionCard';
import { NoContentCard, PageHero } from "@/shared/components";
import { LoaderCircle, Star } from "lucide-react";

export function LoadingLeaderboardContent() {
    return (
        <main id="leaderboard-page" className="p-4">

            {/* Hero Section */}
            <PageHero
                title="Leaderboards"
                description="See how you rank against other students in your cohort."
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-4">
                <NoContentCard title="Loading"
                    description="Leaderboard data is loading..."
                    icon={<LoaderCircle
                        className="size-6 text-muted-foreground animate-spin"
                        aria-hidden="true"
                    />}
                />
            </div>
        </main>
    );
}

export function EmptyLeaderboardContent() {
    return (
        <main id="leaderboard-page" className="p-4">

            {/* Hero Section */}
            <PageHero
                title="Leaderboards"
                description="See how you rank against other students in your cohort."
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-4">
                <NoContentCard title="No enrollment"
                    description="You are not yet enrolled on a course. Please contact your lecturer."
                    icon={<Star
                        className="size-6 text-muted-foreground"
                        aria-hidden="true"
                    />}
                />
            </div>
        </main>
    );
}

export function LeaderboardContent(props: Readonly<LeaderboardProps>) {
    return (
        <main id="leaderboard-page" className="p-4">

            {/* Hero Section */}
            <PageHero title="Leaderboards"
            subtitle={props.courseTitle}
            description="See how you rank against other students in your cohort." />
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                
                {/* Podium Results */}
                <div className="lg:col-span-3">
                    <TopStudentsCard subjects={props.subjects}
                        topFive={props.topFive}
                        currentUser={props.currentUser}
                        userInTop5={props.userInTop5} />
                </div>

                {/* Progress Charts */}
                <div className="lg:col-span-2">
                    <div className='flex flex-col gap-4'>
                        <ComparisonCard />
                        <ScoreDistributionCard />
                    </div>
                </div>
            </div>
        </main>
    );
}
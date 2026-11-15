import { Card } from '@/shared/components'
import type { LeaderboardProps } from "../model"
import { TopStudentsCard } from './TopStudentsCard';
import { ComparisonCard } from './ComparisonCard';
import { ScoreDistributionCard } from './ScoreDistributionCard';


export function LeaderboardContent(props: Readonly<LeaderboardProps>) {
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
import {
    type LeaderboardProps,
} from "../model"

export function LeaderboardPage({
    courseTitle = "Course title",

}: LeaderboardProps) {

    return (
        <main id="leaderboard-page" className="min-h-screen p-4">

            {/* Hero Section */}
            <section className="mb-8 flex flex-col justify-between rounded-2xl bg-navy p-10 text-white shadow-md lg:flex-row">
                <div className="mb-6 flex flex-col justify-center lg:mb-0">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">{courseTitle}</p>
                    <h1 className="mb-2 font-heading text-4xl font-bold tracking-tight text-white">Leaderboards</h1>
                    <p className="text-sm text-white/80">See how you rank against other students in your cohort.</p>
                </div>
            </section>

           
        </main>
    );
}
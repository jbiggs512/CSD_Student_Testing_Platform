import { Star } from 'lucide-react'
import { Card } from '@shared/components'

export function EmptyLeaderboardContent() {
    return (
        <main id="leaderboard-page" className="p-4">

            {/* Hero Section */}
            <section className="mb-8 flex flex-col justify-between rounded-2xl bg-navy p-10 text-white shadow-md lg:flex-row">
                <div className="mb-6 flex flex-col justify-center lg:mb-0">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70"></p>
                    <h1 className="mb-2 font-heading text-4xl font-bold tracking-tight text-white">Leaderboards</h1>
                    <p className="text-sm text-white/80">See how you rank against other students in your cohort.</p>
                </div>
            </section>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-4">
                <Card className="gap-0 border-0 py-0 shadow-md">
                    <div className="flex flex-col items-center justify-center gap-3 px-6 py-32 text-center">
                        <div className="rounded-full bg-muted p-3">
                            <Star
                                className="size-6 text-muted-foreground"
                                aria-hidden="true"
                            />
                        </div>
                        <div className="space-y-1">
                            <h2 className="font-medium">No enrollment</h2>
                            <p className="max-w-sm text-sm text-muted-foreground">
                                You are not yet enrolled on a course. Please contact your lecturer.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </main>
    );
}
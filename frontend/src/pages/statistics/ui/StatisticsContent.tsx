import type { StatisticsProps } from "../model"
import { LockKeyhole } from 'lucide-react'
import { Card } from "@/shared/components";

export function StatisticsContent(props: Readonly<StatisticsProps>) {
    return (
        <main id="statistics-page" className="p-4">
            {/* Hero Section */}
            <section className="mb-8 flex flex-col justify-between rounded-2xl bg-navy p-10 text-white shadow-md lg:flex-row">
                <div className="mb-6 flex flex-col justify-center lg:mb-0">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">{props.courseTitle}</p>
                    <h1 className="mb-2 font-heading text-4xl font-bold tracking-tight text-white">Statistics</h1>
                    <div className="flex items-center gap-2 text-white/80">
                        <LockKeyhole />
                        <span className="text-sm">Only you can see this page.</span>
                    </div>
                </div>
            </section>

            {/* Stats overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex items-stretch">
                <Card className="shadow-sm rounded-xl p-0">
                    <div className="justify-center p-6">
                        <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy/70">Total Points</span>
                        <div className="font-heading text-5xl font-bold">100</div>
                    </div>
                </Card>
                <Card className="shadow-sm rounded-xl p-0">
                    <div className="justify-center p-6">
                        <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy/70">Average Score</span>
                        <div className="font-heading text-5xl font-bold">82%</div>
                    </div>
                </Card>
                <Card className="shadow-sm border-2 rounded-xl border-green-500 p-0">
                    <div className="justify-center p-6">
                        <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy/70">Best Score</span>
                        <div className="font-heading text-5xl font-bold text-green-500">86%</div>
                        <span className="mb-2 text-xs font-semibold text-navy/70">Test 1 - 10 Oct</span>
                    </div>
                </Card>
                <Card className="shadow-sm border-2 rounded-xl border-red-600 p-0">
                    <div className="justify-center p-6">
                        <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy/70">Worst Score</span>
                        <div className="font-heading text-5xl font-bold text-red-600">76%</div>
                        <span className="mb-2 text-xs font-semibold text-navy/70">Test 4 - 21 Oct</span>
                    </div>
                </Card>
            </div>

            {/* Graph for results over time */}
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                    <Card className="p-6 shadow-sm">
                        <div className="mb-6 flex items-centre justify-between">
                            <h3 className="text-3xl font-bold text-navy py-4">Grades Over Time</h3>
                        </div>
                    </Card>
                </div>
                <div className="col-span-1">
                    <Card className="p-6 shadow-sm">
                        <div className="mb-6 flex items-centre justify-between">
                            <h3 className="text-3xl font-bold text-navy py-4">Export Results</h3>
                        </div>
                    </Card>
                </div>
                <div className="lg:col-span-3">
                    <Card className="p-6 shadow-sm">
                        <div className="mb-6 flex items-centre justify-between">
                            <h3 className="text-3xl font-bold text-navy py-4">Grades Over Time - Data Table</h3>
                        </div>
                    </Card>
                </div>
            </div>
        </main>
    );
}
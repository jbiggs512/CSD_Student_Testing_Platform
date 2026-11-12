import type { StatisticsProps } from "../model"
import { LockKeyhole } from 'lucide-react'

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
        </main>
    );
}
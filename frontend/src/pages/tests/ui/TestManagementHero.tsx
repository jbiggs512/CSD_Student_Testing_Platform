import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/components'
import { cn } from '@shared/lib/utils'
import type { TestManagementStats } from '../model'

interface HeroStatCardProps {
  title: string
  subtitle?: string
  value: string
  isTextValue?: boolean
}

function HeroStatCard({
  title,
  subtitle,
  value,
  isTextValue = false,
}: Readonly<HeroStatCardProps>) {
  return (
    <Card className="min-w-0 justify-between overflow-hidden border-0 bg-white/10 py-5 text-white shadow-none backdrop-blur-xs sm:min-w-44">
      <CardHeader className="min-w-0 gap-0.5 px-5">
        <CardDescription className="text-xs font-semibold uppercase tracking-wider text-white/80">
          {title}
        </CardDescription>
        {subtitle && (
          <CardDescription className="text-[11px] font-medium uppercase tracking-wider text-white/60">
            {subtitle}
          </CardDescription>
        )}
        <CardTitle
          title={value}
          className={cn(
            'min-w-0 pt-2 font-heading font-bold text-white wrap-break-word',
            isTextValue
              ? 'line-clamp-3 text-lg leading-snug sm:text-xl'
              : 'text-3xl sm:text-4xl',
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

interface TestManagementHeroProps {
  stats?: TestManagementStats | null
}

export function TestManagementHero({
  stats,
}: Readonly<TestManagementHeroProps>) {
  const studentTotal = stats ? String(stats.student_total) : '—'
  const studentAverage =
    stats && stats.student_average_last_7_days !== null
      ? `${Math.round(stats.student_average_last_7_days)}%`
      : '—'
  const weakestTest = stats?.weakest_test_last_7_days ?? '—'

  return (
    <section className="flex flex-col justify-between gap-8 rounded-2xl bg-navy p-8 text-white shadow-md lg:flex-row lg:items-center lg:p-12">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
          Teaching and assessment
        </p>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Test Management
        </h1>
        <p className="max-w-xl text-sm leading-6 text-white/80 sm:text-base">
          Create, modify, and deactivate tests.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <HeroStatCard title="Student Total" value={studentTotal} />
        <HeroStatCard
          title="Student Average"
          subtitle="(Last 7 Days)"
          value={studentAverage}
        />
        <HeroStatCard
          title="Weakest Test"
          subtitle="(Last 7 Days)"
          value={weakestTest}
          isTextValue={Boolean(stats?.weakest_test_last_7_days)}
        />
      </div>
    </section>
  )
}

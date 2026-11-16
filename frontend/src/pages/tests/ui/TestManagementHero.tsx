import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/components'

interface HeroStatCardProps {
  title: string
  subtitle?: string
  value: string
}

function HeroStatCard({
  title,
  subtitle,
  value,
}: Readonly<HeroStatCardProps>) {
  return (
    <Card className="min-w-44 justify-between border-0 bg-white/10 py-5 text-white shadow-none backdrop-blur-xs">
      <CardHeader className="gap-0.5 px-5">
        <CardDescription className="text-xs font-semibold uppercase tracking-wider text-white/80">
          {title}
        </CardDescription>
        {subtitle && (
          <CardDescription className="text-[11px] font-medium uppercase tracking-wider text-white/60">
            {subtitle}
          </CardDescription>
        )}
        <CardTitle className="pt-2 font-heading text-3xl font-bold text-white sm:text-4xl">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

export function TestManagementHero() {
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
        <HeroStatCard title="Student Total" value="—" />
        <HeroStatCard
          title="Student Average"
          subtitle="(Last 7 Days)"
          value="—"
        />
        <HeroStatCard
          title="Weakest Test"
          subtitle="(Last 7 Days)"
          value="—"
        />
      </div>
    </section>
  )
}

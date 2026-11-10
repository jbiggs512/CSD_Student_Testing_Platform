import { Link } from 'react-router'
import { ArrowRightIcon, UsersIcon } from 'lucide-react'
import { Button } from '@shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card'

export function LecturerDashboardPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] p-4">
      <section className="flex min-h-72 flex-col justify-center rounded-2xl bg-navy p-10 text-white shadow-md sm:p-14">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
          Teaching and assessment
        </p>
        <h1 className="mt-2 font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Welcome to the lecturer dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
          Manage student accounts and keep learners ready to take part in their
          courses and assessments.
        </p>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <UsersIcon className="size-8 text-pink" aria-hidden="true" />
            <CardTitle className="font-heading text-2xl text-plum">
              Student management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Review, approve, update, disable, and remove student accounts.
            </p>
            <Button asChild>
              <Link to="/students">
                Manage students
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

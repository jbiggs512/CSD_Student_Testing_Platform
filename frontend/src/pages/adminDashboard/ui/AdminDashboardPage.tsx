import { Link } from 'react-router'
import { ArrowRightIcon } from 'lucide-react'
import { Button } from '@shared/components/ui/button'

export function AdminDashboardPage() {
  return (
    <main id="admin-dashboard-page" className="min-h-screen p-4">
      <section className="flex min-h-72 flex-col justify-center rounded-2xl bg-navy p-10 text-white shadow-md sm:p-14">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
          Administration
        </p>
        <h1 className="mt-2 font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Welcome to the admin dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
          Manage the platform from one place. Start by viewing and maintaining
          the subjects available to learners.
        </p>
        <div className="mt-8">
          <Button
            asChild
            className="bg-white text-navy hover:bg-white/90"
          >
            <Link to="/subjects">
              Manage subjects
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  )
}

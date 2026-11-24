import {
  ClipboardListIcon,
  HelpCircleIcon,
  UsersIcon,
} from 'lucide-react'
import { DashboardLinkCard } from '@shared/components/dashboard-link-card'

export function LecturerDashboardPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] p-4">
      <section className="flex min-h-72 flex-col justify-center rounded-2xl bg-navy p-10 text-white shadow-md sm:p-14">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
          Teaching and assessment
        </p>
        <h1 className="mt-2 font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Welcome to the teaching dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
          Manage student accounts and keep learners ready to take part in their
          courses and assessments.
        </p>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        <DashboardLinkCard
          icon={UsersIcon}
          title="Student management"
          description="Review, approve, update, disable, and remove student accounts."
          to="/students"
          linkLabel="Manage students"
        />
        <DashboardLinkCard
          icon={ClipboardListIcon}
          title="Test management"
          description="Create, configure, and manage subject assessments generated from your question pools."
          to="/tests"
          linkLabel="Manage tests"
        />
        <DashboardLinkCard
          icon={HelpCircleIcon}
          title="Question pool management"
          description="Organise multiple-choice questions by subject, add new questions, and keep your question pool up to date."
          to="/questionPool"
          linkLabel="Manage question pool"
        />
      </section>
    </main>
  )
}

import {
  BookOpenIcon,
  ClipboardListIcon,
  HelpCircleIcon,
  LibraryBigIcon,
  UsersIcon,
} from 'lucide-react'
import { DashboardLinkCard } from '@shared/components/dashboard-link-card'

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
          Manage the platform from one place. Maintain accounts, courses, and
          subjects available to learners.
        </p>
      </section>

      <section
        aria-label="Administration pages"
        className="mt-8 grid gap-6 md:grid-cols-3"
      >
        <DashboardLinkCard
          icon={UsersIcon}
          title="Account management"
          description="Create and manage lecturer and administrator accounts."
          to="/accounts"
          linkLabel="Manage accounts"
        />
        <DashboardLinkCard
          icon={BookOpenIcon}
          title="Course management"
          description="Create and update the courses available across the platform."
          to="/courses"
          linkLabel="Manage courses"
        />
        <DashboardLinkCard
          icon={LibraryBigIcon}
          title="Subject management"
          description="Manage the subjects available to learners and their courses."
          to="/subjects"
          linkLabel="Manage subjects"
        />
      </section>

      <section
        aria-label="Teaching tools"
        className="mt-8"
      >
        <h2 className="mb-4 font-heading text-2xl font-bold text-plum">
          Teaching tools
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
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
            description="Create, configure, and manage subject assessments."
            to="/tests"
            linkLabel="Manage tests"
          />
          <DashboardLinkCard
            icon={HelpCircleIcon}
            title="Question pool management"
            description="Organise questions by subject and keep question pools up to date."
            to="/questionPool"
            linkLabel="Manage question pool"
          />
        </div>
      </section>
    </main>
  )
}

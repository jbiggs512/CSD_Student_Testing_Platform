import { Link } from 'react-router'
import {
  ArrowRightIcon,
  BookOpenIcon,
  ClipboardListIcon,
  HelpCircleIcon,
  LibraryBigIcon,
  UsersIcon,
} from 'lucide-react'
import { Button } from '@shared/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@shared/components/ui/card'

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
        <Card className="shadow-sm">
          <CardHeader>
            <UsersIcon className="size-8 text-pink" aria-hidden="true" />
            <CardTitle className="font-heading text-2xl text-plum">
              Account management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create and manage lecturer and administrator accounts.
            </p>
            <Button asChild>
              <Link to="/accounts">
                Manage accounts
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <BookOpenIcon className="size-8 text-pink" aria-hidden="true" />
            <CardTitle className="font-heading text-2xl text-plum">
              Course management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create and update the courses available across the platform.
            </p>
            <Button asChild>
              <Link to="/courses">
                Manage courses
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <LibraryBigIcon className="size-8 text-pink" aria-hidden="true" />
            <CardTitle className="font-heading text-2xl text-plum">
              Subject management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage the subjects available to learners and their courses.
            </p>
            <Button asChild>
              <Link to="/subjects">
                Manage subjects
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section
        aria-label="Teaching tools"
        className="mt-8"
      >
        <h2 className="mb-4 font-heading text-2xl font-bold text-plum">
          Teaching tools
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
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

          <Card className="shadow-sm">
            <CardHeader>
              <ClipboardListIcon className="size-8 text-pink" aria-hidden="true" />
              <CardTitle className="font-heading text-2xl text-plum">
                Test management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create, configure, and manage subject assessments.
              </p>
              <Button asChild>
                <Link to="/tests">
                  Manage tests
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <HelpCircleIcon className="size-8 text-pink" aria-hidden="true" />
              <CardTitle className="font-heading text-2xl text-plum">
                Question pool management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Organise questions by subject and keep question pools up to date.
              </p>
              <Button asChild>
                <Link to="/questionPool">
                  Manage question pool
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}

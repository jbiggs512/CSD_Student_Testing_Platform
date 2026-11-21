import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Progress,
  PageHero,
  NoContentCard,
} from "@/shared/components";
import { LoaderCircle, CircleCheckBig, BookCheck } from 'lucide-react'
import { Link } from 'react-router'
import { SORT_OPTIONS, FILTER_OPTIONS, type DashboardContentProps } from "../model";
import { CompletedTestsDialog } from './CompletedTestsDialog'

export function LoadingDashboardContent() {
  return (
    <main id="statistics-page" className="p-4">
      {/* Hero Section */}
      <PageHero
        title="Welcome back, Student!"
        description="You have no outstanding tests!"
      />

      <div className="grid grid-cols-1 gap-4">
        <NoContentCard title="Loading"
          description="Dashboard data is loading..."
          icon={<LoaderCircle
            className="size-6 text-muted-foreground animate-spin"
            aria-hidden="true"
          />}
        />
      </div>
    </main>
  );
}

export function DashboardContent({ completedTests = [], outstandingTests = [], cohortRank = { rank: 0, size: 0 }, courseTitle = "" }: DashboardContentProps) {

  // Calculate the average score percentage, rounding to the nearest whole number
  const averageScore = completedTests.length > 0
    ? Math.round(completedTests.reduce((sum, test) => sum + test.score_percentage, 0) / completedTests.length)
    : null;

  // Plural placeholder for outstanding tests caption
  const testPlural = outstandingTests.length === 1 ? "" : "s";

  return (
    <main id="dashboard-page" className="p-4">

      {/* Hero Section */}
      <PageHero
        title="Welcome back, Student!"
        subtitle={courseTitle}
        description={outstandingTests.length === 0
          ? "You have no outstanding tests!"
          : `You have ${outstandingTests.length} outstanding test${testPlural} to complete.`}>
        <div className="flex flex-wrap gap-4">
          <div className="flex min-w-[150px] flex-col justify-center rounded-xl bg-white/10 p-6">
            <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">Tests Completed</span>
            <div className="font-heading text-3xl font-bold">
              {completedTests.length === 0 ? (
                <span className="text-5xl">0</span>
              ) : (
                <><span className="text-5xl">{completedTests.length}</span> <span className="text-xl font-medium">of {completedTests.length + outstandingTests.length}</span></>
              )}
            </div>
          </div>
          <div className="flex min-w-[150px] flex-col justify-center rounded-xl bg-white/10 p-6">
            <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">Average Score</span>
            <div className="font-heading text-5xl font-bold">{averageScore !== null ? `${averageScore}%` : '-'}</div>
          </div>
          <div className="flex min-w-[150px] flex-col justify-center rounded-xl bg-white/10 p-6">
            <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">Cohort Rank</span>
            <div className="font-heading text-3xl font-bold">
              {completedTests.length === 0 ? (
                <span className="text-5xl">-</span>
              ) : (
                <><span className="text-5xl">{cohortRank.rank}</span> <span className="text-xl font-medium">of {cohortRank.size}</span></>
              )}
            </div>
          </div>
        </div>
      </PageHero>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">

        {/* Outstanding Tests */}
        <div>
          <div className="mb-6 flex items-centre justify-between">
            <h3 className="text-3xl font-bold text-navy py-4">Outstanding Tests</h3>
            {/* Only show dropdowns if there are outstanding tests */}
            {outstandingTests.length > 0 && (
              <div className="flex gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="outstandingSort" className="text-xs font-medium text-muted-foreground">Sort by</label>
                  <Select id="outstandingSort" items={SORT_OPTIONS}>
                    <SelectTrigger className="h-8 w-[120px] bg-background"><SelectValue placeholder="Sort Option" /></SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="outstandingFilter" className="text-xs font-medium text-muted-foreground">Filter by</label>
                  <Select id="outstandingFilter" items={FILTER_OPTIONS}>
                    <SelectTrigger className="h-8 w-[120px] bg-background"><SelectValue placeholder="Filter option" /></SelectTrigger>
                    <SelectContent>
                      {FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          {outstandingTests.length === 0 ? (
            <NoContentCard
              title="No Outstanding Tests"
              description="You're up to date on all your tests!"
              icon={<CircleCheckBig
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {outstandingTests.map((test) => (
                <Card key={test.id} className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="font-heading text-2xl font-bold text-navy">{test.test_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs font-bold uppercase text-navy">{test.subject_name}</p>
                    <p className="text-sm text-muted-foreground">{test.description}</p>
                    <p className="mt-2 text-sm font-semibold text-navy">{test.questions_per_attempt} Questions</p>
                  </CardContent>
                  <CardFooter>
                    <Button>
                      <Link to={`/test/${test.id}`}>Start Test</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>)}
        </div>

        {/* Completed Tests */}
        <div>
          <div className="mb-6 flex items-centre justify-between">
            <h3 className="text-3xl font-bold text-navy py-4">Completed Tests</h3>
            {/* Only show dropdowns if there are completed tests */}
            {completedTests.length > 0 && (
              <div className="flex gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="completedSort" className="text-xs font-medium text-muted-foreground">Sort by</label>
                  <Select id="completedSort" items={SORT_OPTIONS}>
                    <SelectTrigger className="h-8 w-[120px] bg-background"><SelectValue placeholder="Sort Option" /></SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="completedFilter" className="text-xs font-medium text-muted-foreground">Filter by</label>
                  <Select id="completedFilter" items={FILTER_OPTIONS}>
                    <SelectTrigger className="h-8 w-[120px] bg-background"><SelectValue placeholder="Filter option" /></SelectTrigger>
                    <SelectContent>
                      {FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          {completedTests.length === 0 ? (
            <NoContentCard
              title="No Completed Tests"
              description="You've not yet completed any tests."
              icon={<BookCheck
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {completedTests.slice(0, 4).map((test) => (
                  <Card key={test.id} className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-heading text-2xl font-bold text-navy">{test.test_name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="mb-3 flex items-baseline gap-2">
                        <span className="font-heading text-3xl font-bold text-navy">{test.score_percentage}%</span>
                        <span className="text-xs font-medium text-navy">{test.questions_correct} of {test.questions_total} correct</span>
                      </div>
                      <Progress value={test.score_percentage} className="w-full max-w-sm mb-2" />
                      <div className="text-xs font-medium text-muted-foreground">
                        <p>{test.completed_date}</p>
                        <p className="mt-0.5 text-foreground/70">{test.score_points} points</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* Only show view all tests link if there are completed tests */}
              {completedTests.length > 0 && (
                <div className="mt-6 flex justify-end">
                  <CompletedTestsDialog tests={completedTests} />
                </div>
              )}
            </>)}
        </div>
      </div>
    </main >
  );
}
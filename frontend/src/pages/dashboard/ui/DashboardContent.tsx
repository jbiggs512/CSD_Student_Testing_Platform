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
} from "@/shared/components";
import { Link } from 'react-router'
import { SORT_OPTIONS, FILTER_OPTIONS, type DashboardContentProps } from "../model";
import { CompletedTestsDialog } from './CompletedTestsDialog'

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
      <section className="mb-8 flex flex-col justify-between rounded-2xl bg-navy p-10 text-white shadow-md lg:flex-row">
        <div className="mb-6 flex flex-col justify-center lg:mb-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">{courseTitle}</p>
          <h1 className="mb-2 font-heading text-4xl font-bold tracking-tight text-white">Welcome back, Student!</h1>
          <p className="text-sm text-white/80">
            {outstandingTests.length === 0
              ? "You have no outstanding tests!"
              : `You have ${outstandingTests.length} outstanding test${testPlural} to complete.`}
          </p>
        </div>
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
      </section>

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
            <Card className="flex h-64 flex-col items-center justify-center p-8 text-center shadow-sm">
              <h4 className="mb-2 font-heading text-3xl font-bold text-navy">No Outstanding Tests</h4>
              <p className="text-sm font-bold text-navy">You're up to date on all your tests!</p>
            </Card>
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
            <Card className="flex h-64 flex-col items-center justify-center p-8 text-center shadow-sm">
              <h4 className="mb-2 font-heading text-3xl font-bold text-navy">No Completed Tests</h4>
              <p className="text-sm font-bold text-navy">You've not yet completed any tests.</p>
            </Card>
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
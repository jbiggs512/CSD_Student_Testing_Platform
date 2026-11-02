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
import { SORT_OPTIONS, FILTER_OPTIONS, COURSE_TITLE, type DashboardContentProps } from "../model";
import { Link } from 'react-router'

export function DashboardContent({ completedTests = [], outstandingTests = [], cohortRank = { rank: 0, size: 0 } }: DashboardContentProps) {

  // Calculate the average score percentage, rounding to the nearest whole number
  const averageScore = completedTests.length > 0
    ? Math.round(completedTests.reduce((sum, test) => sum + test.scorePercentage, 0) / completedTests.length)
    : null;

  return (
    <main id="dashboard-page" className="min-h-screen p-4">

      {/* Hero Section */}
      <section className="mb-8 flex flex-col justify-between rounded-2xl bg-navy p-10 text-white shadow-md lg:flex-row">
        <div className="mb-6 flex flex-col justify-center lg:mb-0">
          <h1 className="mb-2 font-heading text-4xl font-bold tracking-tight text-white">Welcome back, Student!</h1>
          <h2 className="mb-6 font-heading text-2xl font-bold text-white">{COURSE_TITLE}</h2>
          <p className="text-sm text-white/80">
            {outstandingTests.length === 0
              ? "You have no outstanding tests!"
              : `You have ${outstandingTests.length} outstanding tests to complete.`}
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
          <div className="mb-6 flex items-end justify-between">
            <h3 className="text-3xl font-bold text-navy">Outstanding Tests</h3>
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
              {outstandingTests.map(({ id, testName, subjectName, description, questionsPerAttempt }) => (
                <Card key={id} className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="font-heading text-2xl font-bold text-navy">{testName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs font-bold uppercase text-navy">{subjectName}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                    <p className="mt-2 text-sm font-semibold text-navy">{questionsPerAttempt} Questions</p>
                  </CardContent>
                  <CardFooter>
                    <Button>Start Test</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>)}
        </div>

        {/* Completed Tests */}
        <div>
          <div className="mb-6 flex items-end justify-between">
            <h3 className="text-3xl font-bold text-navy">Completed Tests</h3>
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
                {completedTests.map(({ id, testName, scorePercentage, questionsCorrect, questionsTotal, completedDate, scorePoints }) => (
                  <Card key={id} className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-heading text-2xl font-bold text-navy">{testName}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="mb-3 flex items-baseline gap-2">
                        <span className="font-heading text-3xl font-bold text-navy">{scorePercentage}%</span>
                        <span className="text-xs font-medium text-navy">{questionsCorrect} of {questionsTotal} correct</span>
                      </div>
                      <Progress value={scorePercentage} className="w-full max-w-sm mb-2" />
                      <div className="text-xs font-medium text-muted-foreground">
                        <p>{completedDate}</p>
                        <p className="mt-0.5 text-foreground/70">{scorePoints} points</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* Only show view all tests link if there are completed tests */}
              {completedTests.length > 0 && (
                <div className="mt-6 flex justify-end">
                  <Button variant="link" className="text-sm font-bold text-navy underline decoration-2 underline-offset-4 transition-colors hover:text-primary"> View All Completed Tests...</Button>
                </div>
              )}
            </>)}
        </div>
      </div>
    </main >
  );
}
import type { LeaderboardProps, EmptyLeaderboardProps, SelectSubjectProps } from "../model"
import { TopStudentsCard } from './TopStudentsCard';
import { ComparisonCard } from './ComparisonCard';
import { ScoreDistributionCard } from './ScoreDistributionCard';
import {
    Alert,
    AlertDescription,
    NoContentCard,
    PageHero,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/shared/components";
import { AlertCircleIcon, LoaderCircle, Star, BookOpenCheck } from "lucide-react";

function SelectSubject({ subjects, selectedSubjectId, onSubjectChange }: Readonly<SelectSubjectProps>) {
    const selectedSubject = subjects.find(
        (option) => option.value === selectedSubjectId,
    );

    if (subjects.length > 0) {
        return (
            <div className="flex min-w-[150px] flex-col justify-center rounded-xl bg-white/10 p-6">
                <div className="flex flex-col gap-1">
                    <label htmlFor="subjectFilter" className="text-xs font-medium text-white/70">Subject</label>
                    <Select
                        items={subjects}
                        defaultValue={selectedSubject?.value}
                        onValueChange={(value) => {
                            if (value) onSubjectChange(value);
                        }}
                    >
                        <SelectTrigger id="subjectFilter" className="h-8 w-[200px]">
                            <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent>
                            {subjects.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        );
    }
    return null;
}

function ErrorMessage({ pageError }: Readonly<{ pageError: string | null }>) {
    // Display page error if populated
    if (pageError) {
        return (
            <Alert variant="destructive">
                <AlertCircleIcon aria-hidden="true" />
                <AlertDescription>{pageError}</AlertDescription>
            </Alert>
        )
    }
    return null;
}

export function LoadingLeaderboardContent() {
    return (
        <main id="leaderboard-page" className="p-4">

            {/* Hero Section */}
            <PageHero
                title="Leaderboards"
                description="See how you rank against other students in your cohort."
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-4">
                <NoContentCard title="Loading"
                    description="Leaderboard data is loading..."
                    icon={<LoaderCircle
                        className="size-6 text-muted-foreground animate-spin"
                        aria-hidden="true"
                    />}
                />
            </div>
        </main>
    );
}

export function EmptyLeaderboardContent(props: Readonly<EmptyLeaderboardProps>) {
    return (
        <main id="leaderboard-page" className="p-4">

            {/* Hero Section */}
            <PageHero title="Leaderboards"
                subtitle={props.courseTitle}
                description="See how you rank against other students in your cohort.">
                <SelectSubject
                    selectedSubjectId={props.selectedSubjectId}
                    subjects={props.subjects}
                    onSubjectChange={props.onSubjectChange}
                />
            </PageHero>

            <ErrorMessage pageError={props.pageError} />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-4">
                <NoContentCard title="No Completed Tests"
                    description="No tests have been completed for this subject yet. Please check back later."
                    icon={<BookOpenCheck
                        className="size-6 text-muted-foreground"
                        aria-hidden="true"
                    />}
                />
            </div>
        </main>
    );
}

export function NoEnrollmentContent({ pageError }: Readonly<{ pageError: string | null }>) {
    return (
        <main id="leaderboard-page" className="p-4">

            {/* Hero Section */}
            <PageHero
                title="Leaderboards"
                description="See how you rank against other students in your cohort."
            />

           <ErrorMessage pageError={pageError} />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-4">
                <NoContentCard title="No enrollment"
                    description="You are not yet enrolled on a course. Please contact your lecturer."
                    icon={<Star
                        className="size-6 text-muted-foreground"
                        aria-hidden="true"
                    />}
                />
            </div>
        </main>
    );
}

export function LeaderboardContent(props: Readonly<LeaderboardProps>) { 
    return (
        <main id="leaderboard-page" className="p-4">

            {/* Hero Section */}
            <PageHero title="Leaderboards"
                subtitle={props.courseTitle}
                description="See how you rank against other students in your cohort.">
                <SelectSubject
                    selectedSubjectId={props.selectedSubjectId}
                    subjects={props.subjects}
                    onSubjectChange={props.onSubjectChange}
                />
            </PageHero>

            <ErrorMessage pageError={props.pageError} />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

                {/* Podium Results */}
                <div className="lg:col-span-3">
                    <TopStudentsCard subjects={props.subjects}
                        selectedSubjectId={props.selectedSubjectId}
                        topFive={props.topFive}
                        currentUser={props.currentUser}
                        userInTop5={props.userInTop5} />
                </div>

                {/* Progress Charts */}
                <div className="lg:col-span-2">
                    <div className='flex flex-col gap-4'>
                        {props.cohortComparison != undefined && (
                            <ComparisonCard data={props.cohortComparison} />
                        )}
                        {props.scoreDistribution != undefined && (
                            <ScoreDistributionCard data={props.scoreDistribution} />
                        )}
                    </div>
                </div>
            </div>
        </main >
    );
}
import { useState, useEffect } from 'react';
import { LeaderboardContent, LoadingLeaderboardContent, EmptyLeaderboardContent, NoEnrollmentContent } from "./LeaderboardContent";
import { getCourseTitle, getSubjects, getLeaderboard, getCohortComparison, getScoreDistribution } from '../api';
import { getErrorMessage } from '@shared/lib/utils'
import {
    type CohortComparisonResponse,
    type LeaderboardEntry,
    type LeaderboardResponse,
    type ScoreDistributionResponse,
    type SubjectFilter
} from "../model"

const DEFAULT_CURRENT_USER: LeaderboardEntry = {
    user_id: 0,
    rank: 0,
    name: "",
    avg_score: 0,
    points: 0,
};

export function LeaderboardPage() {
    const [courseTitle, setCourseTitle] = useState<string>("");
    const [subjects, setSubjects] = useState<SubjectFilter[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number>();
    const [leaderboard, setLeaderboard] = useState<LeaderboardResponse>();
    const [comparison, setComparison] = useState<CohortComparisonResponse>();
    const [scoreDistribution, setScoreDistribution] = useState<ScoreDistributionResponse>();

    const [pageError, setPageError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load the current users course and the subjects 
    useEffect(() => {
        async function loadInitialData() {
            try {
                const [course, subjectList] = await Promise.all([
                    getCourseTitle(),
                    getSubjects(),
                ]);

                if (course !== undefined) setCourseTitle(course);
                if (subjectList !== undefined) {
                    setSubjects(subjectList);
                    if (subjectList.length > 0) {
                        setSelectedSubjectId(subjectList[0].value);
                    } else {
                        setIsLoading(false);
                    }
                } else {
                    setIsLoading(false);
                }
            } catch (error) {
                setPageError(getErrorMessage(error))
                setIsLoading(false);
            }
        }

        void loadInitialData();
    }, []);

    // Load the leaderboard and graph data based on the current selected subject
    useEffect(() => {
        if (selectedSubjectId === undefined) return;

        setIsLoading(true);
        setLeaderboard(undefined);
        setComparison(undefined);
        setScoreDistribution(undefined);

        async function loadSubjectData() {
            try {
                const leaderboardData = await getLeaderboard(selectedSubjectId ?? 0);
                setLeaderboard(leaderboardData);

                const comparisonData = await getCohortComparison(selectedSubjectId ?? 0);
                setComparison(comparisonData);

                const distributionData = await getScoreDistribution(selectedSubjectId ?? 0);
                setScoreDistribution(distributionData);
            } catch (error) {
                setPageError(getErrorMessage(error));
                setIsLoading(false);
            } finally {
                setIsLoading(false);
            }
        }

        void loadSubjectData();
    }, [selectedSubjectId]);

    // When subject is changed, reload the leaderboard and progress charts
    function handleSubjectChange(subjectId: number) {
        if (subjectId != selectedSubjectId) {
            setIsLoading(true);
            setSelectedSubjectId(subjectId);
        }
    }

    if (isLoading) return <LoadingLeaderboardContent />

    if (selectedSubjectId === undefined) {
        return <NoEnrollmentContent pageError={pageError} />
    }

    if (!leaderboard?.top_students.some((data) => data.avg_score > 0)){
        return <EmptyLeaderboardContent 
            pageError={pageError}
            courseTitle={courseTitle}
            subjects={subjects}
            selectedSubjectId={selectedSubjectId}
            onSubjectChange={handleSubjectChange}
         />
    }

    return (
        <LeaderboardContent
            pageError={pageError}
            courseTitle={courseTitle}
            subjects={subjects}
            selectedSubjectId={selectedSubjectId}
            onSubjectChange={handleSubjectChange}
            topFive={leaderboard?.top_students ?? []}
            currentUser={leaderboard?.current_user_entry ?? DEFAULT_CURRENT_USER}
            userInTop5={leaderboard?.is_in_top_5 ?? false}
            cohortComparison={comparison}
            scoreDistribution={scoreDistribution}
        />
    )
}
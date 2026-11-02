import type { OutstandingTest, CompletedTest, CohortRank } from "../model"

export function getOutstandingTests(): OutstandingTest[] {
    // Mock data for outstanding tests
    return [
        // {
        //     id: 1,
        //     testName: 'Test 1',
        //     subjectName: 'Subject 1',
        //     description: 'This is a description for Test 1.',
        //     questionsPerAttempt: 10,
        // },
        // {
        //     id: 2,
        //     testName: 'Test 2',
        //     subjectName: 'Subject 2',
        //     description: 'This is a description for Test 2.',
        //     questionsPerAttempt: 15,
        // },
        // {
        //     id: 3,
        //     testName: 'Test 3',
        //     subjectName: 'Subject 3',
        //     description: 'This is a description for Test 3.',
        //     questionsPerAttempt: 20,
        // },
    ]
}

export function getCompletedTests(): CompletedTest[] {
    // Mock data for completed tests
    return [
        {
            id: 1,
            testName: 'Test 1',
            scorePercentage: 50,
            questionsCorrect: 6,
            questionsTotal: 12,
            completedDate: '10th October 2026',
            scorePoints: 280
        },
        {
            id: 2,
            testName: 'Test 2',
            scorePercentage: 92,
            questionsCorrect: 18,
            questionsTotal: 20,
            completedDate: '15th October 2026',
            scorePoints: 360
        }
    ]
}

export function getCohortRank(): CohortRank {
    return {
        rank: 12,
        size: 48
    }
}
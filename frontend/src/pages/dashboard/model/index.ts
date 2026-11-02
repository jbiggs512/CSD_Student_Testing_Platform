// Dashboard page state, types, and business logic
export const COURSE_TITLE = "Course Title"

export const SORT_OPTIONS = [
    { label: "Sort by...", value: null },
    { label: "A - Z", value: 1 },
    { label: "Z - A", value: 2 },
    { label: "Created Date Asc", value: 3 },
    { label: "Created Date Desc", value: 4 },
]

export const FILTER_OPTIONS = [
    { label: "Filter by...", value: null },
    { label: "All", value: "all" },
    { label: "Subject 1", value: "subject1" },
    { label: "Subject 2", value: "subject2" },
]

export {
    type OutstandingTest,
    type CompletedTest,
    type CohortRank
} from "./types"




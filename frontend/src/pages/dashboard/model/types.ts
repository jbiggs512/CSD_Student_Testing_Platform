export interface OutstandingTest {
    id: number
    test_name: string
    subject_name: string
    description: string
    questions_per_attempt: number
}

export interface CompletedTest {
    id: number
    test_id: number
    test_name: string
    subject_name: string
    score_percentage: number
    questions_correct: number
    questions_total: number
    completed_date: string
    score_points: number
}

export interface CohortRank {
    rank: number
    size: number
}

export interface DashboardContentProps {
  readonly outstandingTests?: OutstandingTest[];  
  readonly completedTests?: CompletedTest[]; 
  readonly cohortRank?: CohortRank;
  readonly courseTitle: string;
}

export const SORT_OPTIONS_OUTSTANDING = [
    { label: "Sort by...", value: null },
    { label: "Test Name (A - Z)", value: 1 },
    { label: "Test Name (Z - A)", value: 2 },
    { label: "Subject (A - Z)", value: 3 },
    { label: "Subject (Z - A)", value: 4 },
    { label: "Question Count (Asc)", value: 5 },
    { label: "Question Count (Desc)", value: 6 },
]

export const SORT_OPTIONS_COMPLETED = [
    { label: "Sort by...", value: null },
    { label: "Test Name (A - Z)", value: 1 },
    { label: "Test Name (Z - A)", value: 2 },
    { label: "Subject (A - Z)", value: 3 },
    { label: "Subject (Z - A)", value: 4 },
    { label: "Date (Asc)", value: 5 },
    { label: "Date (Desc)", value: 6 },
]

export const ALL_FILTER = "all";

export function buildFilterOptions(subjects: string[]) {
  return [
    { label: "Filter by...", value: null },
    { label: "All", value: ALL_FILTER },
    ...[...new Set(subjects)].sort((a, b) => a.localeCompare(b)).map((s) => ({ label: s, value: s })),
  ];
}

export function sortAndFilterOutstanding(items: OutstandingTest[],
  sort: number | null,
  filter: string | null,): OutstandingTest[] {
  const filtered =
    filter && filter !== ALL_FILTER
      ? items.filter((t) => t.subject_name === filter)
      : items;

  switch (sort) {
    case 1: return [...filtered].sort((a, b) => a.test_name.localeCompare(b.test_name));
    case 2: return [...filtered].sort((a, b) => b.test_name.localeCompare(a.test_name)); 
    case 3: return [...filtered].sort((a, b) => a.subject_name.localeCompare(b.subject_name));
    case 4: return [...filtered].sort((a, b) => b.subject_name.localeCompare(a.subject_name));
    case 5: return [...filtered].sort((a, b) => a.questions_per_attempt - b.questions_per_attempt);
    case 6: return [...filtered].sort((a, b) => b.questions_per_attempt - a.questions_per_attempt);  
    default: return filtered;
  }
}

export function sortAndFilterCompleted(items: CompletedTest[],
  sort: number | null,
  filter: string | null,): CompletedTest[] {
  const filtered =
    filter && filter !== ALL_FILTER
      ? items.filter((t) => t.subject_name === filter)
      : items;

  const byDate = (t: CompletedTest) => new Date(t.completed_date).getTime();

  switch (sort) {
    case 1: return [...filtered].sort((a, b) => a.test_name.localeCompare(b.test_name));
    case 2: return [...filtered].sort((a, b) => b.test_name.localeCompare(a.test_name));
    case 3: return [...filtered].sort((a, b) => a.subject_name.localeCompare(b.subject_name));
    case 4: return [...filtered].sort((a, b) => b.subject_name.localeCompare(a.subject_name));
    case 5: return [...filtered].sort((a, b) => byDate(a) - byDate(b));
    case 6: return [...filtered].sort((a, b) => byDate(b) - byDate(a));
    default: return filtered;
  }
}
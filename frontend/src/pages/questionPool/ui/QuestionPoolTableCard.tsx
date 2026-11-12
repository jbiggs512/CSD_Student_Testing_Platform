import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  DownloadIcon,
  Edit2Icon,
  HelpCircleIcon,
  LoaderCircleIcon,
  SearchIcon,
  Trash2Icon,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Input,
} from '@shared/components'
import type { Question, QuestionRowItem } from '../model'

const QUESTIONS_PER_PAGE = 5

function QuestionTextCell({ question }: Readonly<{ question: Question }>) {
  const correctOption = question.options.find((opt) => opt.is_correct)
  return (
    <div>
      <div className="font-medium text-foreground">
        {question.question_text}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Correct answer:{' '}
        {correctOption ? correctOption.option_text : 'Not set'} &middot;{' '}
        {question.options.length} options
      </div>
    </div>
  )
}

function QuestionActionsCell({
  item,
  onEditQuestion,
  onDeleteQuestion,
}: Readonly<{
  item: QuestionRowItem
  onEditQuestion: (question: Question) => void
  onDeleteQuestion: (question: Question) => void
}>) {
  const { question, code } = item
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onEditQuestion(question)}
        aria-label={`Edit ${code}`}
      >
        <Edit2Icon aria-hidden="true" />
        <span className="hidden lg:inline">Edit</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onDeleteQuestion(question)}
        aria-label={`Delete ${code}`}
        className="text-destructive hover:text-destructive"
      >
        <Trash2Icon aria-hidden="true" />
      </Button>
    </div>
  )
}

function createQuestionColumns(
  onEditQuestion: (question: Question) => void,
  onDeleteQuestion: (question: Question) => void,
): ColumnDef<QuestionRowItem>[] {
  return [
    {
      accessorKey: 'code',
      header: 'ID',
      meta: {
        headClassName: 'w-32',
        cellClassName: 'font-medium tabular-nums text-foreground',
      },
    },
    {
      id: 'question_text',
      header: 'Question',
      cell: ({ row }) => <QuestionTextCell question={row.original.question} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { headClassName: 'w-44 text-right' },
      cell: ({ row }) => (
        <QuestionActionsCell
          item={row.original}
          onEditQuestion={onEditQuestion}
          onDeleteQuestion={onDeleteQuestion}
        />
      ),
    },
  ]
}

interface QuestionPoolTableCardProps {
  totalQuestions: number
  filteredQuestions: QuestionRowItem[]
  searchTerm: string
  isLoading: boolean
  hasSelectedSubject: boolean
  onSearchChange: (value: string) => void
  onDownloadPool: () => void
  onCreateFirst: () => void
  onEditQuestion: (question: Question) => void
  onDeleteQuestion: (question: Question) => void
}

export function QuestionPoolTableCard({
  totalQuestions,
  filteredQuestions,
  searchTerm,
  isLoading,
  hasSelectedSubject,
  onSearchChange,
  onDownloadPool,
  onCreateFirst,
  onEditQuestion,
  onDeleteQuestion,
}: Readonly<QuestionPoolTableCardProps>) {
  const columns = useMemo(
    () => createQuestionColumns(onEditQuestion, onDeleteQuestion),
    [onEditQuestion, onDeleteQuestion],
  )

  const showEmptyState = !isLoading && filteredQuestions.length === 0
  const showQuestionTable = !isLoading && filteredQuestions.length > 0

  return (
    <Card className="gap-0 border-0 py-0 shadow-md">
      <CardHeader className="gap-4 border-b py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="font-heading text-2xl font-bold text-plum">
            Subject questions
          </CardTitle>
          <CardDescription>
            {totalQuestions} {totalQuestions === 1 ? 'question' : 'questions'}{' '}
            in this subject pool
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={onDownloadPool}
            disabled={totalQuestions === 0}
            className="w-full sm:w-auto"
          >
            <DownloadIcon aria-hidden="true" />
            Download JSON
          </Button>
          <div className="relative min-w-0 sm:w-72">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Search questions"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
            <LoaderCircleIcon
              className="size-4 animate-spin"
              aria-hidden="true"
            />
            Loading questions...
          </div>
        )}

        {showEmptyState && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="rounded-full bg-muted p-3">
              <HelpCircleIcon
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <div className="space-y-1">
              <h2 className="font-medium">
                {totalQuestions === 0
                  ? 'No questions in this subject pool'
                  : 'No matching questions'}
              </h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                {totalQuestions === 0
                  ? 'Add the first multiple-choice question to start building this subject pool.'
                  : 'Try changing your search term.'}
              </p>
            </div>
            {totalQuestions === 0 && hasSelectedSubject && (
              <Button type="button" onClick={onCreateFirst}>
                Add your first question
              </Button>
            )}
          </div>
        )}

        {showQuestionTable && (
          <DataTable
            columns={columns}
            data={filteredQuestions}
            pageSize={QUESTIONS_PER_PAGE}
            itemLabel="questions"
            className="min-w-[900px]"
          />
        )}
      </CardContent>
    </Card>
  )
}

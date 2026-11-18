import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { TrophyIcon } from 'lucide-react'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
} from '@shared/components'
import type { GradePoint } from '../model'

const RESULTS_PER_PAGE = 5

function CompletedDateCell({ completedAt }: Readonly<{ completedAt: string }>) {
  return (
    <span className="tabular-nums">
      {new Date(completedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}
    </span>
  )
}

function GradeHighlightCell({ point }: Readonly<{ point: GradePoint }>) {
  if (point.is_best) {
    return (
      <Badge className="bg-[#F4B767] text-[#0A2262] hover:bg-[#F4B767]">
        Best
      </Badge>
    )
  }
  if (point.is_worst) {
    return (
      <Badge className="bg-[#B44D70] text-white hover:bg-[#B44D70]">
        Worst
      </Badge>
    )
  }
  return null
}

function createGradeColumns(): ColumnDef<GradePoint>[] {
  return [
    {
      accessorKey: 'test_name',
      header: 'Test',
      meta: { cellClassName: 'font-medium text-foreground' },
    },
    {
      accessorKey: 'completed_at',
      header: 'Completed',
      meta: { headClassName: 'w-40' },
      cell: ({ row }) => (
        <CompletedDateCell completedAt={row.original.completed_at} />
      ),
    },
    {
      accessorKey: 'percentage',
      header: 'Grade',
      meta: {
        headClassName: 'w-28',
        cellClassName: 'font-semibold tabular-nums text-foreground',
      },
      cell: ({ row }) => `${row.original.percentage}%`,
    },
    {
      id: 'highlight',
      header: '',
      meta: { headClassName: 'w-28 text-right', cellClassName: 'text-right' },
      cell: ({ row }) => <GradeHighlightCell point={row.original} />,
    },
  ]
}

export function GradesTableCard({ points }: Readonly<{ points: GradePoint[] }>) {
  const columns = useMemo(() => createGradeColumns(), [])

  // Newest first for the table, instead of oldest first for the graph, as returned by API
  const rows = useMemo(
    () =>
      [...points].sort(
        (a, b) =>
          new Date(b.completed_at).getTime() -
          new Date(a.completed_at).getTime(),
      ),
    [points],
  )

  return (
    <Card className="gap-0 border-0 py-0 shadow-md">
      <CardHeader className="gap-1 border-b py-5">
        <CardTitle className="font-heading text-2xl font-bold text-plum">
          Grades Over Time Breakdown
        </CardTitle>
        <CardDescription>
          {rows.length} completed {rows.length === 1 ? 'test' : 'tests'}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        {rows.length > 0 &&
          <DataTable
            columns={columns}
            data={rows}
            pageSize={RESULTS_PER_PAGE}
            itemLabel="results"
            className="min-w-[600px]"
          />
        }
      </CardContent>
    </Card>
  )
}
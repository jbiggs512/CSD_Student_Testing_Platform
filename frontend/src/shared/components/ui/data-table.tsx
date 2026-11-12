import { useEffect, useState } from "react"
import {
  type ColumnDef,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { cn } from "@/shared/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageSize?: number
  itemLabel?: string
  className?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageSize = 5,
  itemLabel = "items",
  className,
}: Readonly<DataTableProps<TData, TValue>>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
      pageSize,
    }))
  }, [data, pageSize])

  const table = useReactTable({
    data,
    columns,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const pageCount = Math.max(1, table.getPageCount())
  const currentPage = pagination.pageIndex + 1
  const totalRows = data.length
  const startItem =
    totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const endItem = Math.min(
    (pagination.pageIndex + 1) * pagination.pageSize,
    totalRows,
  )

  return (
    <div>
      <Table className={cn("min-w-[720px] text-left text-sm", className)}>
        <TableHeader className="bg-navy text-xs uppercase tracking-wide text-white/80">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-b-0 hover:bg-transparent"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "px-6 py-3 font-medium text-white/80",
                    (
                      header.column.columnDef.meta as
                        | { headClassName?: string }
                        | undefined
                    )?.headClassName,
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="divide-y divide-border">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="transition-colors hover:bg-pink/5"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "px-6 py-4",
                      (
                        cell.column.columnDef.meta as
                          | { cellClassName?: string }
                          | undefined
                      )?.cellClassName,
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col items-center justify-between gap-4 border-t px-6 py-4 text-xs text-muted-foreground sm:flex-row">
        <div>
          Showing {startItem}–{endItem} of {totalRows} {itemLabel}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            className="cursor-pointer rounded-md px-2.5 py-1.5 font-medium text-muted-foreground hover:text-navy disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map(
            (pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => table.setPageIndex(pageNumber - 1)}
                aria-current={pageNumber === currentPage ? "page" : undefined}
                className={
                  pageNumber === currentPage
                    ? "cursor-pointer rounded-md bg-navy px-2.5 py-1.5 font-semibold text-white"
                    : "cursor-pointer rounded-md px-2.5 py-1.5 font-medium text-navy hover:bg-muted"
                }
              >
                {pageNumber}
              </button>
            ),
          )}
          <button
            type="button"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            className="cursor-pointer rounded-md px-2.5 py-1.5 font-medium text-navy hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

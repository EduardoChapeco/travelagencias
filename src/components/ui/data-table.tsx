import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { GhostButton } from "@/components/ui/form";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Loader2,
} from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  pageCount?: number;
  onPaginationChange?: (updater: any) => void;
  pagination?: {
    pageIndex: number;
    pageSize: number;
  };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  pageCount,
  onPaginationChange,
  pagination,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const isControlled = pagination !== undefined;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: isControlled ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    manualPagination: isControlled,
    pageCount: isControlled ? pageCount : undefined,
    onPaginationChange: isControlled ? onPaginationChange : undefined,
    state: {
      sorting,
      ...(isControlled ? { pagination } : {}),
    },
  });

  return (
    <div className="flex-1 flex flex-col justify-between h-full min-h-0 space-y-4">
      <div className="flex-1 rounded-[var(--radius-card)] border-none glass-card text-white overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <Table>
            <TableHeader className="bg-white/5 border-b border-white/10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-none">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        className="text-xs uppercase tracking-wider text-muted-foreground"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <div className="flex justify-center items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando dados...
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-surface-alt/30 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2 rounded-[var(--radius-card)] bg-white/5 border border-white/5 shadow-xs select-none">
        <div className="text-xs text-muted-foreground/80 font-medium">
          {table.getFilteredRowModel().rows.length} linha(s) total
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center justify-center text-xs font-medium text-muted-foreground/90">
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
          </div>
          <div className="flex items-center space-x-1">
            <GhostButton
              className="hidden h-7 w-7 p-0 lg:flex rounded-full"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Ir para a primeira página</span>
              <ChevronsLeft className="h-3.5 w-3.5" />
            </GhostButton>
            <GhostButton
              className="h-7 w-7 p-0 rounded-full"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Voltar uma página</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </GhostButton>
            <GhostButton
              className="h-7 w-7 p-0 rounded-full"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Ir para a próxima página</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </GhostButton>
            <GhostButton
              className="hidden h-7 w-7 p-0 lg:flex rounded-full"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Ir para a última página</span>
              <ChevronsRight className="h-3.5 w-3.5" />
            </GhostButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: React.HTMLAttributes<HTMLDivElement> & {
  column: any;
  title: string;
}) {
  if (!column.getCanSort()) {
    return <div className={className}>{title}</div>;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="flex items-center gap-1 hover:text-foreground hover:bg-surface-alt px-1.5 py-1 -ml-1.5 rounded-full transition-colors"
      >
        <span>{title}</span>
        {column.getIsSorted() === "desc" ? (
          <ArrowUpDown className="h-3 w-3 rotate-180 transition-transform" />
        ) : column.getIsSorted() === "asc" ? (
          <ArrowUpDown className="h-3 w-3 transition-transform" />
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
        )}
      </button>
    </div>
  );
}

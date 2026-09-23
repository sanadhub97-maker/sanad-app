import { useState } from "react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type VisibilityState } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Columns3, Search, X, Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";

interface DataTableProps<T extends object> {
  // TanStack's ColumnDef is invariant in TValue in a way that makes an array
  // of heterogeneously-typed columns (built via createColumnHelper) fail to
  // unify against ColumnDef<T, unknown>[] — `any` here is the standard,
  // deliberate workaround (recommended by the TanStack Table maintainers).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  data: T[];
  isLoading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  toolbar?: React.ReactNode;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

export function DataTable<T extends object>({
  columns,
  data,
  isLoading,
  page,
  pageSize,
  total,
  onPageChange,
  searchValue,
  onSearchChange,
  toolbar,
  onRowClick,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {onSearchChange && (
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute start-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("common.search")}
              className="ps-9 pe-8 h-10 rounded-2xl border-border/80 bg-background/80 shadow-xs focus-visible:ring-primary/20 text-xs sm:text-sm font-medium transition-all"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute end-3 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <div className="ms-auto flex items-center gap-2">
          {toolbar}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 gap-1.5 rounded-2xl border-border/80 bg-background/80 px-3 shadow-xs hover:bg-muted font-semibold text-xs">
                <Columns3 className="h-4 w-4 text-muted-foreground" />
                <span className="hidden sm:inline">{t("common.columns", { defaultValue: "Columns" })}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 shadow-luxury border-border/80 bg-background/95 backdrop-blur-xl">
              {table.getAllLeafColumns().map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(v) => column.toggleVisibility(!!v)}
                  onSelect={(e) => e.preventDefault()}
                  className="rounded-xl text-xs font-medium cursor-pointer"
                >
                  {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Table Container with Specular Top Edge */}
      <div className="relative rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-luxury overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent z-10" />
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/30 dark:bg-black/20 hover:bg-muted/30 border-b border-border/70">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="py-3.5 px-4 text-[11px] font-black text-foreground/85 uppercase tracking-wider">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="border-b border-border/40">
                  {columns.map((_, j) => (
                    <TableCell key={j} className="py-4 px-4">
                      <Skeleton className="h-4 w-full rounded-lg" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState
                    icon={Inbox}
                    title={emptyTitle ?? t("common.noResults")}
                    description={emptyDescription}
                    action={emptyAction}
                    className="border-0 rounded-none bg-transparent py-12"
                  />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    "group relative border-b border-border/40 transition-all duration-150",
                    onRowClick
                      ? "cursor-pointer hover:bg-primary/[0.04] dark:hover:bg-primary/[0.08]"
                      : "hover:bg-muted/20"
                  )}
                >
                  {row.getVisibleCells().map((cell, cellIdx) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "py-3.5 px-4 text-xs sm:text-sm font-medium transition-colors",
                        cellIdx === 0 && "relative"
                      )}
                    >
                      {cellIdx === 0 && onRowClick && (
                        <span className="absolute start-0 top-2 bottom-2 w-1 rounded-full bg-primary opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
                      )}
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground px-1 select-none">
          <div className="rounded-xl border border-border/70 bg-background/80 px-3.5 py-1.5 font-medium shadow-xs">
            {t("common.showing", { defaultValue: "Showing" })}{" "}
            <span className="font-black text-foreground">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
            </span>{" "}
            {t("common.of", { defaultValue: "of" })}{" "}
            <span className="font-black text-foreground">{total}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="h-9 w-9 rounded-xl border-border/80 bg-background/80 disabled:opacity-40 hover:bg-muted shadow-xs transition-transform active:scale-95"
              title={t("common.previous", { defaultValue: "Previous" })}
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <div className="flex items-center px-3 py-1.5 text-xs font-bold text-foreground bg-background/80 border border-border/80 rounded-xl shadow-xs">
              {page} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="h-9 w-9 rounded-xl border-border/80 bg-background/80 disabled:opacity-40 hover:bg-muted shadow-xs transition-transform active:scale-95"
              title={t("common.next", { defaultValue: "Next" })}
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

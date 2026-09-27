import { useState } from "react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type VisibilityState } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Columns3, Search, X, Inbox, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/common/empty-state";
import { PrintDocumentHeader, PrintDocumentFooter } from "@/components/common/print-document-header";
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
  printTitle?: string;
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
  printTitle,
}: DataTableProps<T>) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
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
      {/* 🖨️ Official Print Document Header (Visible only on paper/PDF print) */}
      <PrintDocumentHeader
        title={printTitle || t("common.recordsReport", { defaultValue: "تقرير السجلات والبيانات الرسمية" })}
      />

      {/* Search & Actions Bar */}
      <div className="flex flex-wrap items-center gap-3 no-print">
        {onSearchChange && (
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute start-[18px] top-[14px] h-[18px] w-[18px] text-muted-foreground pointer-events-none" />
            <Input
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("common.search")}
              className="ps-11 pe-9 h-[46px] rounded-full border-transparent bg-card shadow-[var(--glass-shadow)] text-sm"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute end-4 top-[15px] text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <div className="ms-auto flex items-center gap-2">
          {toolbar}

          {/* Quick Print Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-[46px] gap-1.5 px-4 text-[13px]"
            title={isAr ? "طباعة التقرير" : "Print Report"}
          >
            <Printer className="h-4 w-4 text-muted-foreground" />
            <span className="hidden sm:inline">{isAr ? "طباعة" : "Print"}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-[46px] gap-1.5 px-4 text-[13px]">
                <Columns3 className="h-4 w-4 text-muted-foreground" />
                <span className="hidden sm:inline">{t("common.columns", { defaultValue: "Columns" })}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-3xl p-2">
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
      <div className="lux-rows relative overflow-hidden rounded-[26px] bg-card shadow-[var(--glass-shadow)] desk:overflow-visible desk:rounded-none desk:bg-transparent desk:shadow-none">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-border hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-12 px-4 text-[12.5px] font-semibold text-muted-foreground">
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
                    "group relative border-b border-border/60 transition-colors",
                    onRowClick ? "cursor-pointer hover:bg-secondary" : "hover:bg-secondary/60"
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
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 🖨️ Official Print Document Footer (Signatures & Stamp) */}
      <PrintDocumentFooter />

      {/* Pagination Controls */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground px-1 select-none no-print">
          <div className="rounded-full bg-card px-4 py-2 font-medium shadow-[var(--glass-shadow)]">
            {t("common.showing", { defaultValue: "Showing" })}{" "}
            <span className="font-semibold text-foreground">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
            </span>{" "}
            {t("common.of", { defaultValue: "of" })}{" "}
            <span className="font-semibold text-foreground">{total}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="h-10 w-10 disabled:opacity-40"
              title={t("common.previous", { defaultValue: "Previous" })}
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <div className="flex items-center rounded-full bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-[var(--glass-shadow)]">
              {page} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="h-10 w-10 disabled:opacity-40"
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

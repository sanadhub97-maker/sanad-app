import { useState } from "react";
import { localized } from "@/lib/names";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, UserRound, X, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types/models";

type PickerEmployee = Pick<
  Employee,
  | "id"
  | "employeeNumber"
  | "fullNameAr"
  | "fullNameEn"
  | "jobTitle"
  | "jobTitleEn"
  | "iqamaNumber"
  | "nationality"
>;

/* ── Gradient palette: each employee gets a stable colour by index hash ── */
const GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-cyan-600",
  "from-pink-500 to-fuchsia-600",
  "from-teal-500 to-green-600",
  "from-indigo-500 to-blue-700",
];

function gradientFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

/** Searchable employee selector with glassmorphism design.
 *  Find by name, employee number, or iqama number.
 *  Each option shows avatar initials, name, department and employee number. */
export function EmployeePicker({
  employees,
  value,
  onChange,
  invalid,
  disabled,
}: {
  employees: PickerEmployee[];
  value?: string;
  onChange: (id: string | undefined) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [open, setOpen] = useState(false);
  const selected = employees.find((e) => e.id === value);
  const nameOf = (e: PickerEmployee) =>
    isAr ? e.fullNameAr : e.fullNameEn || e.fullNameAr;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* ── Trigger ── */}
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          className={cn(
            // Base
            "group relative flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-start text-sm",
            "transition-all duration-300 ease-out",
            // Glass surface
            "border bg-background/60 backdrop-blur-md",
            // Shadow + glow
            "shadow-sm",
            // States
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Border colours
            invalid
              ? "border-destructive/60 shadow-destructive/10"
              : open
              ? "border-primary/60 shadow-primary/10 shadow-md"
              : "border-border/70 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
          )}
        >
          {/* Subtle inner highlight */}
          <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.07] to-transparent" />

          {selected ? (
            <>
              {/* Avatar */}
              <span
                className={cn(
                  "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                  "bg-gradient-to-br text-[11px] font-bold text-white shadow-md",
                  gradientFor(selected.id)
                )}
              >
                {initials(nameOf(selected))}
                {/* Glow ring when open */}
                <span
                  className={cn(
                    "absolute inset-0 rounded-xl ring-2 ring-primary/50 transition-opacity duration-300",
                    open ? "opacity-100" : "opacity-0"
                  )}
                />
              </span>

              {/* Name + meta */}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-foreground leading-tight">
                  <bdi>{nameOf(selected)}</bdi>
                </span>
                <span className="flex items-center gap-1.5 direction-ltr">
                  <bdi className="font-mono text-[10px] text-muted-foreground">
                    {selected.employeeNumber}
                  </bdi>
                  {localized(selected.jobTitle, selected.jobTitleEn) && (
                    <>
                      <span className="text-muted-foreground/40 text-[10px]">·</span>
                      <bdi className="text-[10px] text-muted-foreground truncate">
                        {localized(selected.jobTitle, selected.jobTitleEn)}
                      </bdi>
                    </>
                  )}
                </span>
              </span>

              {/* Clear button */}
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(undefined);
                }}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
                  "bg-muted/40 text-muted-foreground",
                  "hover:bg-destructive/15 hover:text-destructive",
                  "transition-all duration-200"
                )}
                title={isAr ? "إزالة" : "Clear"}
              >
                <X className="h-3 w-3" />
              </span>
            </>
          ) : (
            <>
              <UserRound className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              <span className="flex-1 truncate text-muted-foreground/70">
                {isAr ? "ابحث واختر الموظف..." : "Search and select an employee..."}
              </span>
              <ChevronsUpDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform duration-300",
                  open && "rotate-180"
                )}
              />
            </>
          )}
        </button>
      </PopoverTrigger>

      {/* ── Dropdown ── */}
      <PopoverContent
        align="start"
        dir={isAr ? "rtl" : "ltr"}
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0",
          "rounded-2xl shadow-2xl",
          "border border-border/50 bg-popover/95 backdrop-blur-xl",
          // Entrance animation
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97]",
          "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.97]",
          "data-[state=open]:slide-in-from-top-1",
          "duration-200"
        )}
      >
        <Command>
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            <CommandInput
              placeholder={
                isAr
                  ? "الاسم، الرقم الوظيفي، أو رقم الإقامة"
                  : "Name, employee # or iqama #"
              }
              className="h-8 border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground/50 focus:ring-0"
            />
          </div>

          {/* List */}
          <CommandList className="max-h-72 py-1.5 px-1.5">
            <CommandEmpty className="py-8 text-center text-sm text-muted-foreground/60">
              {employees.length === 0
                ? isAr
                  ? "لا يوجد موظفون مسجلون بعد"
                  : "No employees yet"
                : isAr
                ? "لا يوجد موظف مطابق"
                : "No matching employee"}
            </CommandEmpty>

            <CommandGroup>
              {employees.map((e) => {
                const isSelected = value === e.id;
                return (
                  <CommandItem
                    key={e.id}
                    value={[
                      e.fullNameAr,
                      e.fullNameEn,
                      e.employeeNumber,
                      e.iqamaNumber,
                      e.id,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onSelect={() => {
                      onChange(e.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-2.5 py-2.5 cursor-pointer",
                      "transition-all duration-200",
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50"
                    )}
                  >
                    {/* Avatar */}
                    <span
                      className={cn(
                        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        "bg-gradient-to-br text-[12px] font-bold text-white shadow-md",
                        "transition-transform duration-200 group-hover:scale-105",
                        gradientFor(e.id),
                        isSelected && "ring-2 ring-primary/50 ring-offset-1 ring-offset-background"
                      )}
                    >
                      {initials(nameOf(e))}
                    </span>

                    {/* Info */}
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm font-semibold leading-tight",
                          isSelected ? "text-primary" : "text-foreground"
                        )}
                      >
                        <bdi>{nameOf(e)}</bdi>
                      </span>
                      <span className="flex items-center gap-1.5 mt-0.5">
                        <bdi
                          className={cn(
                            "font-mono text-[10px] px-1.5 py-px rounded-md",
                            "bg-muted/70 text-muted-foreground border border-border/50"
                          )}
                        >
                          {e.employeeNumber}
                        </bdi>
                        {localized(e.jobTitle, e.jobTitleEn) && (
                          <bdi className="text-[10px] text-muted-foreground/70 truncate">
                            {localized(e.jobTitle, e.jobTitleEn)}
                          </bdi>
                        )}
                        {e.iqamaNumber && (
                          <>
                            <span className="text-muted-foreground/30 text-[10px]">·</span>
                            <bdi className="text-[10px] text-muted-foreground/60 font-mono">
                              {e.iqamaNumber}
                            </bdi>
                          </>
                        )}
                      </span>
                    </span>

                    {/* Check mark */}
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                        "transition-all duration-300",
                        isSelected
                          ? "scale-100 opacity-100 bg-primary/20 ring-1 ring-primary/40"
                          : "scale-50 opacity-0"
                      )}
                    >
                      <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


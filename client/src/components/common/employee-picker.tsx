import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, UserRound, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types/models";

type PickerEmployee = Pick<Employee, "id" | "employeeNumber" | "fullNameAr" | "fullNameEn" | "jobTitle" | "iqamaNumber" | "nationality">;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

/** Searchable employee selector: find by name, employee number or iqama
 * number; each option shows who the person is at a glance. */
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
  const nameOf = (e: PickerEmployee) => (isAr ? e.fullNameAr : e.fullNameEn || e.fullNameAr);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          className={cn(
            "flex h-11 w-full items-center gap-2.5 rounded-xl border bg-background/90 px-2.5 text-start text-sm shadow-xs transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50",
            invalid ? "border-destructive/70" : "border-border/80 hover:border-rose-500/50"
          )}
        >
          {selected ? (
            <>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-[11px] font-bold text-white">
                {initials(nameOf(selected))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-foreground">
                  <bdi>{nameOf(selected)}</bdi>
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  <bdi className="font-mono">{selected.employeeNumber}</bdi>
                  {selected.jobTitle ? <> · <bdi>{selected.jobTitle}</bdi></> : null}
                </span>
              </span>
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(undefined);
                }}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                title={isAr ? "إزالة" : "Clear"}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            </>
          ) : (
            <>
              <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-muted-foreground">
                {isAr ? "ابحث واختر الموظف..." : "Search and select an employee..."}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        dir={isAr ? "rtl" : "ltr"}
        className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0 rounded-xl shadow-xl"
      >
        <Command>
          <CommandInput placeholder={isAr ? "الاسم، الرقم الوظيفي، أو رقم الإقامة" : "Name, employee # or iqama #"} />
          <CommandList className="max-h-72">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {employees.length === 0
                ? isAr ? "لا يوجد موظفون مسجلون بعد" : "No employees yet"
                : isAr ? "لا يوجد موظف مطابق" : "No matching employee"}
            </CommandEmpty>
            <CommandGroup>
              {employees.map((e) => (
                <CommandItem
                  key={e.id}
                  // cmdk filters on this string, so include everything worth searching by.
                  value={[e.fullNameAr, e.fullNameEn, e.employeeNumber, e.iqamaNumber, e.id].filter(Boolean).join(" ")}
                  onSelect={() => {
                    onChange(e.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 cursor-pointer"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-bold text-foreground">
                    {initials(nameOf(e))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      <bdi>{nameOf(e)}</bdi>
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      <bdi className="font-mono">{e.employeeNumber}</bdi>
                      {e.jobTitle ? <> · <bdi>{e.jobTitle}</bdi></> : null}
                      {e.iqamaNumber ? <> · {isAr ? "إقامة" : "Iqama"} <bdi className="font-mono">{e.iqamaNumber}</bdi></> : null}
                    </span>
                  </span>
                  <Check className={cn("h-4 w-4 shrink-0 text-rose-500", value === e.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

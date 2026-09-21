import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  X,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DateInputProps {
  value?: string | null; // ISO "yyyy-mm-dd"
  onChange: (isoValue: string) => void;
  onBlur?: () => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const EN_MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const AR_WEEKDAYS = [
  { short: "سب", full: "السبت" },
  { short: "أح", full: "الأحد" },
  { short: "إث", full: "الإثنين" },
  { short: "ثل", full: "الثلاثاء" },
  { short: "أر", full: "الأربعاء" },
  { short: "خم", full: "الخميس" },
  { short: "جم", full: "الجمعة" },
];

const EN_WEEKDAYS = [
  { short: "Su", full: "Sunday" },
  { short: "Mo", full: "Monday" },
  { short: "Tu", full: "Tuesday" },
  { short: "We", full: "Wednesday" },
  { short: "Th", full: "Thursday" },
  { short: "Fr", full: "Friday" },
  { short: "Sa", full: "Saturday" },
];

function parseIso(iso?: string | null): { year: number; month: number; day: number } | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return {
    year: parseInt(m[1], 10),
    month: parseInt(m[2], 10) - 1,
    day: parseInt(m[3], 10),
  };
}

function toIsoString(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoToDisplay(iso?: string | null): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function displayToIso(display: string): string {
  const digits = display.replace(/\D/g, "");
  if (digits.length !== 8) return "";
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  const iso = `${year}-${month}-${day}`;
  const d = new Date(iso);
  const valid = !isNaN(d.getTime()) && d.getUTCDate() === Number(day) && d.getUTCMonth() + 1 === Number(month);
  return valid ? iso : "";
}

function formatDigits(digits: string): string {
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(Boolean).join("/");
}

/** Luxury Executive Liquid Glass DatePicker & Input Component
 * Fully styled for Dark Obsidian & Light Porcelain mode, with bilingual Arabic/English calendar */
export function DateInput({
  value,
  onChange,
  onBlur,
  id,
  name,
  disabled,
  className,
  placeholder,
}: DateInputProps) {
  const { i18n } = useTranslation();
  const isRtl = i18n.language !== "en";

  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(() => isoToDisplay(value));

  // Calendar navigation state
  const today = useMemo(() => new Date(), []);
  const parsedValue = useMemo(() => parseIso(value), [value]);

  const [viewDate, setViewDate] = useState(() => {
    if (parsedValue) return { year: parsedValue.year, month: parsedValue.month };
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");
  const [decadeStart, setDecadeStart] = useState(() => Math.floor(viewDate.year / 12) * 12);

  // Sync display text when value changes from outside
  useEffect(() => {
    setDisplay(isoToDisplay(value));
    if (parsedValue) {
      setViewDate({ year: parsedValue.year, month: parsedValue.month });
    }
  }, [value, parsedValue]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    const formatted = formatDigits(digits);
    setDisplay(formatted);
    if (digits.length === 8) {
      const iso = displayToIso(formatted);
      if (iso) {
        onChange(iso);
        const p = parseIso(iso);
        if (p) setViewDate({ year: p.year, month: p.month });
      }
    } else if (digits.length === 0) {
      onChange("");
    }
  }

  function handleSelectDate(year: number, month: number, day: number) {
    const iso = toIsoString(year, month, day);
    onChange(iso);
    setDisplay(isoToDisplay(iso));
    setOpen(false);
  }

  function handleToday() {
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    handleSelectDate(y, m, d);
    setViewDate({ year: y, month: m });
  }

  function handleClear() {
    onChange("");
    setDisplay("");
    setOpen(false);
  }

  // Navigation handlers
  function prevMonth() {
    setViewDate((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  }

  function nextMonth() {
    setViewDate((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  }

  function prevYear() {
    setViewDate((prev) => ({ ...prev, year: prev.year - 1 }));
  }

  function nextYear() {
    setViewDate((prev) => ({ ...prev, year: prev.year + 1 }));
  }

  // Days grid computation
  const daysGrid = useMemo(() => {
    const { year, month } = viewDate;
    const firstDay = new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    // In Arabic mode, week starts on Saturday (JS day 6)
    // In English mode, week starts on Sunday (JS day 0)
    const firstDayIndex = isRtl
      ? (firstDay.getDay() + 1) % 7
      : firstDay.getDay();

    const days: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDate - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isSelected: Boolean(parsedValue && parsedValue.year === y && parsedValue.month === m && parsedValue.day === d),
        isToday: today.getFullYear() === y && today.getMonth() === m && today.getDate() === d,
      });
    }

    // Current month days
    for (let d = 1; d <= lastDate; d++) {
      days.push({
        day: d,
        month,
        year,
        isCurrentMonth: true,
        isSelected: Boolean(parsedValue && parsedValue.year === year && parsedValue.month === month && parsedValue.day === d),
        isToday: today.getFullYear() === year && today.getMonth() === month && today.getDate() === d,
      });
    }

    // Next month padding days to complete a 6-row grid (42 days)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isSelected: Boolean(parsedValue && parsedValue.year === y && parsedValue.month === m && parsedValue.day === d),
        isToday: today.getFullYear() === y && today.getMonth() === m && today.getDate() === d,
      });
    }

    return days;
  }, [viewDate, isRtl, parsedValue, today]);

  const weekdays = isRtl ? AR_WEEKDAYS : EN_WEEKDAYS;
  const monthName = isRtl ? AR_MONTHS[viewDate.month] : EN_MONTHS[viewDate.month];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative group">
        <input
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={display}
          onChange={handleInputChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder ?? (isRtl ? "يوم/شهر/سنة" : "dd/mm/yyyy")}
          dir="ltr"
          className={cn(
            "flex h-9 w-full rounded-xl border border-input/80 bg-background/80 px-3.5 py-1 pe-10 text-sm text-start font-medium shadow-xs transition-all",
            "placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary",
            "hover:border-border hover:bg-background disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        />
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={isRtl ? "فتح التقويم" : "Open calendar"}
            className={cn(
              "absolute end-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground transition-all",
              "hover:text-primary hover:bg-primary/10 active:scale-95 disabled:opacity-50 cursor-pointer",
              open && "text-primary bg-primary/15 shadow-xs"
            )}
          >
            <CalendarIcon className="h-4 w-4 drop-shadow-xs" />
          </button>
        </PopoverTrigger>
      </div>

      <PopoverContent
        align={isRtl ? "end" : "start"}
        sideOffset={8}
        className={cn(
          "w-[330px] p-4 rounded-2xl border border-border/80 bg-card/95 dark:bg-slate-950/95 backdrop-blur-2xl shadow-2xl z-50 select-none",
          "dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-in fade-in-0 zoom-in-95 duration-150"
        )}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-1 pb-3 border-b border-border/60">
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 cursor-pointer"
              onClick={isRtl ? nextYear : prevYear}
              title={isRtl ? "السنة السابقة" : "Previous year"}
            >
              {isRtl ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 cursor-pointer"
              onClick={isRtl ? nextMonth : prevMonth}
              title={isRtl ? "الشهر السابق" : "Previous month"}
            >
              {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Month & Year Interactive Button */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "days" ? "months" : "days")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-black text-foreground hover:bg-muted/70 hover:text-primary transition-colors cursor-pointer group"
          >
            <span>{monthName}</span>
            <span className="text-primary font-bold">{viewDate.year}</span>
          </button>

          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 cursor-pointer"
              onClick={isRtl ? prevMonth : nextMonth}
              title={isRtl ? "الشهر القادم" : "Next month"}
            >
              {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 cursor-pointer"
              onClick={isRtl ? prevYear : nextYear}
              title={isRtl ? "السنة القادمة" : "Next year"}
            >
              {isRtl ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* View Mode: Days Grid */}
        {viewMode === "days" && (
          <div className="pt-3 space-y-2">
            {/* Weekdays Row */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {weekdays.map((wd) => (
                <span
                  key={wd.full}
                  title={wd.full}
                  className="text-[11px] font-bold text-muted-foreground/80 py-1"
                >
                  {wd.short}
                </span>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1">
              {daysGrid.map((item, idx) => {
                const isCurrent = item.isCurrentMonth;
                const isSelected = item.isSelected;
                const isTod = item.isToday;

                return (
                  <button
                    key={`${item.year}-${item.month}-${item.day}-${idx}`}
                    type="button"
                    onClick={() => handleSelectDate(item.year, item.month, item.day)}
                    className={cn(
                      "h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-pointer relative",
                      isSelected
                        ? "bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white font-black shadow-md shadow-blue-500/30 scale-105 ring-2 ring-blue-400/40"
                        : isTod
                        ? "text-primary font-bold bg-primary/10 border border-primary/30 hover:bg-primary/20"
                        : isCurrent
                        ? "text-foreground hover:bg-muted/80 hover:text-primary"
                        : "text-muted-foreground/35 hover:text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    {item.day}
                    {isTod && !isSelected && (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* View Mode: 12-Month Grid */}
        {viewMode === "months" && (
          <div className="pt-4">
            <div className="flex items-center justify-between px-2 pb-3">
              <span className="text-xs font-bold text-muted-foreground">
                {isRtl ? "اختر الشهر للسنة" : "Select month for"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDecadeStart(Math.floor(viewDate.year / 12) * 12);
                  setViewMode("years");
                }}
                className="text-xs font-extrabold text-primary hover:underline"
              >
                {viewDate.year}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(isRtl ? AR_MONTHS : EN_MONTHS_SHORT).map((m, idx) => {
                const isSelected = viewDate.month === idx;
                const isCurrentMonth = today.getMonth() === idx && today.getFullYear() === viewDate.year;

                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setViewDate((prev) => ({ ...prev, month: idx }));
                      setViewMode("days");
                    }}
                    className={cn(
                      "py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                        : isCurrentMonth
                        ? "border border-primary/40 text-primary bg-primary/5"
                        : "hover:bg-muted/80 text-foreground"
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* View Mode: 12-Year Grid */}
        {viewMode === "years" && (
          <div className="pt-4">
            <div className="flex items-center justify-between px-2 pb-3">
              <span className="text-xs font-bold text-muted-foreground">
                {decadeStart} - {decadeStart + 11}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md"
                  onClick={() => setDecadeStart((prev) => prev - 12)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md"
                  onClick={() => setDecadeStart((prev) => prev + 12)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }, (_, i) => decadeStart + i).map((yr) => {
                const isSelected = viewDate.year === yr;
                const isCurrentYear = today.getFullYear() === yr;

                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setViewDate((prev) => ({ ...prev, year: yr }));
                      setViewMode("months");
                    }}
                    className={cn(
                      "py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                        : isCurrentYear
                        ? "border border-primary/40 text-primary bg-primary/5"
                        : "hover:bg-muted/80 text-foreground"
                    )}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Action Bar */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 px-2.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
          >
            <X className="h-3.5 w-3.5 me-1" />
            {isRtl ? "مسح" : "Clear"}
          </Button>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="h-7 px-2.5 rounded-lg text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
            >
              <Sparkles className="h-3 w-3 me-1 text-amber-500" />
              {isRtl ? "اليوم" : "Today"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-7 px-3 rounded-lg text-xs font-bold cursor-pointer"
            >
              {isRtl ? "تم" : "Done"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

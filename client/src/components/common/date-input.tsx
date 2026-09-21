import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateInputProps {
  value?: string | null; // ISO "yyyy-mm-dd", what the rest of the app stores/sends
  onChange: (isoValue: string) => void;
  onBlur?: () => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
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

/** A dd/mm/yyyy text input — native <input type="date"> renders in whatever
 * format the visitor's OS/browser locale dictates (usually mm/dd/yyyy),
 * which isn't something a web page can override. This masks input as the
 * user types and stores/emits a plain ISO "yyyy-mm-dd" string, so every
 * existing date field (Zod schemas, the API) keeps working unchanged — only
 * the display format changes. A calendar-icon button opens the native
 * picker as a convenience where the browser supports showPicker(). */
export function DateInput({ value, onChange, onBlur, id, name, disabled, className, placeholder }: DateInputProps) {
  const [display, setDisplay] = useState(() => isoToDisplay(value));
  const hiddenPickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplay(isoToDisplay(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    const formatted = formatDigits(digits);
    setDisplay(formatted);
    if (digits.length === 8) {
      onChange(displayToIso(formatted));
    } else if (digits.length === 0) {
      onChange("");
    }
  }

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const iso = e.target.value;
    setDisplay(isoToDisplay(iso));
    onChange(iso);
  }

  function openNativePicker() {
    const el = hiddenPickerRef.current;
    if (el && "showPicker" in el) {
      try {
        (el as HTMLInputElement & { showPicker: () => void }).showPicker();
      } catch {
        // unsupported in this browser — typing still works
      }
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder ?? "dd/mm/yyyy"}
        dir="ltr"
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pe-9 text-sm text-start shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={openNativePicker}
        className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
        title="Open calendar"
      >
        <Calendar className="h-4 w-4" />
      </button>
      <input
        ref={hiddenPickerRef}
        type="date"
        tabIndex={-1}
        value={value ?? ""}
        onChange={handlePickerChange}
        disabled={disabled}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        aria-hidden="true"
      />
    </div>
  );
}

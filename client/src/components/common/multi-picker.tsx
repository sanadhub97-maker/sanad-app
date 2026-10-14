import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface MultiPickerOption {
  id: string;
  label: string;
  /** A second line (employee number, code…), also searched. */
  hint?: string;
}

/** Choose several from a searchable list; the chosen ones show as removable chips. */
export function MultiPicker({
  options,
  value,
  onChange,
  placeholder,
  invalid,
}: {
  options: MultiPickerOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  invalid?: boolean;
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [open, setOpen] = useState(false);
  const chosen = value.map((id) => options.find((o) => o.id === id)).filter((o): o is MultiPickerOption => !!o);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="space-y-2">
      {/* Modal: inside a dialog, the dialog's scroll lock otherwise swallows the mouse wheel over the list. */}
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-expanded={open}
            className={cn(
              "flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-background/90 px-3 text-start text-sm shadow-xs",
              invalid ? "border-destructive/60" : "border-border/80 hover:border-primary/40"
            )}
          >
            <span className={cn("truncate", !chosen.length && "text-muted-foreground")}>
              {chosen.length ? (isAr ? `${chosen.length} مختار` : `${chosen.length} selected`) : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder={isAr ? "ابحث…" : "Search…"} />
            <CommandList className="max-h-72">
              <CommandEmpty>{isAr ? "لا توجد نتائج" : "No results"}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => {
                  const on = value.includes(o.id);
                  return (
                    <CommandItem key={o.id} value={`${o.label} ${o.hint ?? ""} ${o.id}`} onSelect={() => toggle(o.id)} className="gap-2">
                      <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", on ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                        {on && <Check className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <bdi className="block truncate font-medium">{o.label}</bdi>
                        {o.hint && <small className="block truncate text-muted-foreground" dir="ltr">{o.hint}</small>}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
            {value.length > 0 && (
              <div className="flex justify-between border-t p-2 text-xs">
                <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => onChange([])}>
                  {isAr ? "إلغاء الاختيار" : "Clear"}
                </button>
                <button type="button" className="font-semibold text-primary" onClick={() => setOpen(false)}>
                  {isAr ? "تم" : "Done"}
                </button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chosen.map((o) => (
            <span key={o.id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/80 bg-muted/40 py-0.5 ps-2.5 pe-1 text-xs font-medium">
              <bdi className="truncate">{o.label}</bdi>
              <button type="button" onClick={() => toggle(o.id)} aria-label={isAr ? `إزالة ${o.label}` : `Remove ${o.label}`} className="rounded-full p-0.5 hover:bg-muted">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

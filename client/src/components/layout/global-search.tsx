import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { localized } from "@/lib/names";
import { useQuery } from "@tanstack/react-query";
import { Building2, FileText, Search, User, Wallet } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { globalSearch } from "@/api/search";
import type { SearchResultItem } from "@/api/search";

const ICON_BY_TYPE: Record<SearchResultItem["type"], typeof User> = {
  employee: User,
  companyDocument: FileText,
  payment: Wallet,
  branch: Building2,
};

const TYPE_LABEL: Record<SearchResultItem["type"], { en: string; ar: string }> = {
  employee: { en: "Employee", ar: "موظف" },
  companyDocument: { en: "Document", ar: "مستند" },
  payment: { en: "Payment", ar: "دفعة" },
  branch: { en: "Establishment", ar: "مؤسسة" },
};

/** Opens the search (also Ctrl K). "pill" shows the wide search field of the
 * dashboard header, "icon" a round button. */
export function GlobalSearch({ variant = "icon" }: { variant?: "pill" | "icon" }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { data: results, isFetching } = useQuery({
    queryKey: ["global-search", query],
    queryFn: () => globalSearch(query),
    enabled: query.trim().length > 1,
  });

  function go(href: string) {
    setOpen(false);
    setQuery("");
    navigate(href);
  }

  return (
    <>
      {variant === "pill" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hidden h-12 w-[320px] items-center gap-2.5 rounded-full bg-card px-[18px] text-sm text-muted-foreground shadow-[var(--glass-shadow)] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
        >
          <Search className="h-[18px] w-[18px] shrink-0" />
          <span className="truncate">{isAr ? "ابحث عن أي شيء" : "Search anything"}</span>
          <kbd dir="ltr" className="ms-auto rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold">
            Ctrl K
          </kbd>
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={isAr ? "بحث" : "Search"}
        className={
          (variant === "pill" ? "md:hidden " : "") +
          "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card text-foreground shadow-[var(--glass-shadow)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-12 sm:w-12"
        }
      >
        <Search className="h-5 w-5" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="flex items-center border-b border-border/80 px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0 me-2" />
          <CommandInput
            placeholder={isAr ? "ابحث بالاسم، رقم الإقامة، الجواز، الدفعة، أو المؤسسة..." : "Search by name, Iqama, passport, document, establishment..."}
            value={query}
            onValueChange={setQuery}
            className="h-12 border-0 bg-transparent text-sm focus-visible:ring-0"
          />
        </div>
        <CommandList className="max-h-80 p-2">
          {query.trim().length > 1 && !isFetching && (!results || results.length === 0) && (
            <CommandEmpty className="p-6 text-center text-sm text-muted-foreground">
              {isAr ? "لم يتم العثور على نتائج مطابقة." : "No matching results found."}
            </CommandEmpty>
          )}

          {results && results.length > 0 && (
            <CommandGroup heading={isAr ? "النتائج المطابقة" : "Search Results"}>
              {results.map((r) => {
                const Icon = ICON_BY_TYPE[r.type];
                const typeLabel = isAr ? TYPE_LABEL[r.type]?.ar : TYPE_LABEL[r.type]?.en;
                return (
                  <CommandItem
                    key={`${r.type}-${r.id}`}
                    value={`${r.title} ${r.titleEn ?? ""} ${r.subtitle ?? ""}`}
                    onSelect={() => go(r.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/80"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground truncate">{localized(r.title, r.titleEn)}</span>
                        <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                          {typeLabel}
                        </span>
                      </div>
                      {r.subtitle && <div className="text-xs text-muted-foreground truncate mt-0.5">{r.subtitle}</div>}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}


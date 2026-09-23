import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Building2, FileText, Search, User, Wallet } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
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

export function GlobalSearch() {
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
      <Button
        variant="outline"
        className="group relative h-9 w-full max-w-sm justify-start rounded-xl border-border/70 bg-background/60 px-3 text-xs text-muted-foreground shadow-sm hover:border-primary/40 hover:bg-background hover:text-foreground transition-all duration-200"
        onClick={() => setOpen(true)}
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors me-2 shrink-0" />
        <span className="truncate hidden xl:inline">
          {isAr ? "البحث السريع (موظف، إقامة...)" : "Quick search (employees, docs...)"}
        </span>
        <span className="truncate hidden sm:inline xl:hidden">
          {isAr ? "البحث السريع..." : "Quick search..."}
        </span>
        <span className="sm:hidden">{isAr ? "بحث..." : "Search..."}</span>
        <div className="ms-auto flex items-center gap-0.5">
          <kbd className="hidden rounded-md border border-border/80 bg-muted/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline-block shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
            Ctrl K
          </kbd>
        </div>
      </Button>

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
                    value={`${r.title} ${r.subtitle ?? ""}`}
                    onSelect={() => go(r.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/80"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground truncate">{r.title}</span>
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


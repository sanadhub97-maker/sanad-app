import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronLeft, FileText, Search, Users, Wallet } from "lucide-react";
import { globalSearch, type SearchResultItem } from "@/api/search";
import { localized } from "@/lib/names";
import { cn } from "@/lib/utils";
import type { LuluNavItem, LuluTone } from "@/components/lulu/lulu-nav";

const TYPE: Record<SearchResultItem["type"], { icon: typeof Users; tone: LuluTone; ar: string; en: string }> = {
  employee: { icon: Users, tone: "indigo", ar: "الموظفون", en: "Employees" },
  companyDocument: { icon: FileText, tone: "amber", ar: "المستندات", en: "Documents" },
  payment: { icon: Wallet, tone: "violet", ar: "المدفوعات", en: "Payments" },
  branch: { icon: Building2, tone: "teal", ar: "المؤسسات", en: "Establishments" },
};

interface Item {
  group: string;
  title: string;
  sub: string;
  tone: LuluTone;
  icon: typeof Users;
  href: string;
}

/** Quick search (Ctrl K): pages first, then employees, documents, payments
 * and establishments from the server. Arrow keys move, Enter opens. */
export function LuluCommand({ open, onClose, pages }: { open: boolean; onClose: () => void; pages: LuluNavItem[] }) {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setDebounced("");
    setSel(0);
    const id = setTimeout(() => input.current?.focus(), 60);
    return () => clearTimeout(id);
  }, [open]);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 220);
    return () => clearTimeout(id);
  }, [q]);

  const { data: results, isFetching } = useQuery({
    queryKey: ["global-search", debounced],
    queryFn: () => globalSearch(debounced),
    enabled: open && debounced.length > 1,
  });

  const items = useMemo<Item[]>(() => {
    const needle = q.trim().toLowerCase();
    const pageItems = pages
      .filter((p) => !needle || p.label.toLowerCase().includes(needle))
      .map((p) => ({ group: isAr ? "الصفحات" : "Pages", title: p.label, sub: isAr ? "انتقال إلى الصفحة" : "Go to page", tone: p.tone, icon: p.icon, href: p.href }));
    const found = (debounced.length > 1 ? results ?? [] : []).map((r) => {
      const t = TYPE[r.type];
      return { group: isAr ? t.ar : t.en, title: localized(r.title, r.titleEn) ?? r.title, sub: r.subtitle ?? "", tone: t.tone, icon: t.icon, href: r.href };
    });
    return [...pageItems.slice(0, needle ? 6 : 9), ...found].slice(0, 16);
  }, [q, debounced, results, pages, isAr]);

  useEffect(() => setSel(0), [items.length]);
  useEffect(() => {
    list.current?.querySelector(".sel")?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  function go(it: Item | undefined) {
    if (!it) return;
    onClose();
    navigate(it.href);
  }

  function key(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (s + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      go(items[sel]);
    }
  }

  let last = "";
  return (
    <div className={cn("lu-cmd", open && "open")} role="dialog" aria-modal="true" aria-label={isAr ? "البحث السريع" : "Quick search"} onClick={(e) => e.target === e.currentTarget && onClose()} onKeyDown={key}>
      <div className="lu-cmd-box">
        <label className="lu-cmd-in">
          <Search />
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isAr ? "ابحث عن صفحة أو موظف أو رقم إقامة…" : "Search a page, employee or iqama number…"}
            aria-label={isAr ? "بحث" : "Search"}
            autoComplete="off"
          />
          <kbd className="lu-kbd">Esc</kbd>
        </label>
        <div className="lu-cmd-list" ref={list}>
          {items.map((it, j) => {
            const head = it.group !== last ? it.group : null;
            last = it.group;
            const Icon = it.icon;
            return (
              <div key={`${it.href}-${j}`}>
                {head && <div className="lu-cmd-g">{head}</div>}
                <button type="button" className={cn("lu-cmd-it", `lt-${it.tone}`, j === sel && "sel")} style={{ ["--j" as string]: j }} onMouseEnter={() => setSel(j)} onClick={() => go(it)}>
                  <span className="lu-ci">
                    <Icon />
                  </span>
                  <span className="lu-cell">
                    <b>{it.title}</b>
                    {it.sub && <small>{it.sub}</small>}
                  </span>
                  <span className="gk">
                    <ChevronLeft />
                  </span>
                </button>
              </div>
            );
          })}
          {!items.length && (
            <div className="lu-cmd-e">{isFetching ? (isAr ? "جارٍ البحث…" : "Searching…") : isAr ? `لا توجد نتائج لـ «${q}»` : `No results for “${q}”`}</div>
          )}
          {debounced.length > 1 && isFetching && items.length > 0 && <div className="lu-cmd-g">{isAr ? "جارٍ البحث في السجلات…" : "Searching records…"}</div>}
        </div>
        <div className="lu-cmd-f">
          <span>
            <kbd className="lu-kbd">↑</kbd> <kbd className="lu-kbd">↓</kbd> {isAr ? "للتنقل" : "to move"}
          </span>
          <span>
            <kbd className="lu-kbd">Enter</kbd> {isAr ? "للفتح" : "to open"}
          </span>
          <span>
            <kbd className="lu-kbd">Ctrl K</kbd> {isAr ? "من أي مكان" : "from anywhere"}
          </span>
        </div>
      </div>
    </div>
  );
}

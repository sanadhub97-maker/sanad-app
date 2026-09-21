import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategoryChipItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface CategoryChipsProps {
  items: CategoryChipItem[];
  active: string; // "" = all
  onChange: (value: string) => void;
  counts?: Record<string, number>;
  allLabel: string;
  totalCount?: number;
}

/** Horizontal row of filter chips — one per document type/category, each
 * showing an icon and a live count — used by Company Documents, Licenses,
 * and the Employee Documents tab so every category is a visible, clickable
 * entry point instead of hiding behind a dropdown (§15/§17). */
export function CategoryChips({ items, active, onChange, counts, allLabel, totalCount }: CategoryChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      <Chip
        icon={undefined}
        label={allLabel}
        count={totalCount}
        isActive={active === ""}
        onClick={() => onChange("")}
      />
      {items.map((item) => (
        <Chip
          key={item.value}
          icon={item.icon}
          label={item.label}
          count={counts?.[item.value] ?? 0}
          isActive={active === item.value}
          onClick={() => onChange(item.value)}
        />
      ))}
    </div>
  );
}

function Chip({
  icon: Icon,
  label,
  count,
  isActive,
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition-all",
        isActive
          ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
          : "border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span className="whitespace-nowrap">{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
            isActive ? "bg-white/20" : "bg-muted"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

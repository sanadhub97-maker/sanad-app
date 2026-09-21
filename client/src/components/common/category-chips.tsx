import { useRef, useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { motion } from "framer-motion";
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

/**
 * Executive Obsidian & Liquid Glass Category Chips
 * Refined horizontal category filter dock with Apple-style glass pills,
 * count indicators, active specular highlights, and smooth scroll navigation.
 */
export function CategoryChips({
  items,
  active,
  onChange,
  counts,
  allLabel,
  totalCount,
}: CategoryChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function checkScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // In RTL, scrollLeft can be negative or positive depending on the browser
    const maxScroll = scrollWidth - clientWidth;
    const absScroll = Math.abs(scrollLeft);
    setCanScrollLeft(absScroll > 4);
    setCanScrollRight(absScroll < maxScroll - 4);
  }

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [items]);

  function scroll(direction: "left" | "right") {
    if (!scrollRef.current) return;
    const distance = 220;
    // In RTL, scrolling right usually means scrolling towards start or end depending on browser
    scrollRef.current.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
    setTimeout(checkScroll, 300);
  }

  return (
    <div className="group/track relative flex items-center rounded-2xl border border-border/60 bg-card/40 p-1.5 backdrop-blur-xl shadow-2xs">
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute -start-2 z-10 hidden md:flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-background/90 text-muted-foreground shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-background hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </button>
      )}

      {/* Chips Container */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex flex-1 items-center gap-1.5 overflow-x-auto py-0.5 px-0.5 no-scrollbar scroll-smooth"
      >
        <Chip
          icon={Layers}
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

      {/* Scroll Right Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute -end-2 z-10 hidden md:flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-background/90 text-muted-foreground shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-background hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </button>
      )}
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
  const hasCount = count !== undefined && count > 0;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "group relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 select-none",
        isActive
          ? "bg-slate-900 text-white dark:bg-primary dark:text-primary-foreground shadow-[0_4px_14px_rgba(0,0,0,0.18)] dark:shadow-[0_4px_16px_rgba(var(--primary-rgb),0.3)] border border-slate-800/80 dark:border-primary/50 overflow-hidden"
          : "bg-background/70 hover:bg-background text-muted-foreground hover:text-foreground border border-border/60 hover:border-border/90 shadow-2xs hover:shadow-xs"
      )}
    >
      {/* Specular highlight for active obsidian state */}
      {isActive && (
        <span className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      )}

      {/* Icon with mini container */}
      {Icon && (
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-lg transition-colors",
            isActive
              ? "bg-white/15 text-white"
              : "bg-muted/70 text-muted-foreground/80 group-hover:bg-primary/10 group-hover:text-primary"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      )}

      {/* Label */}
      <span className="whitespace-nowrap font-medium tracking-tight">
        {label}
      </span>

      {/* Count Badge */}
      {count !== undefined && (
        <span
          className={cn(
            "flex h-4.5 min-w-[18px] items-center justify-center rounded-full px-1.5 font-mono text-[11px] transition-colors",
            isActive
              ? "bg-white/20 text-white font-bold backdrop-blur-xs"
              : hasCount
              ? "bg-primary/10 text-primary font-bold border border-primary/20"
              : "bg-muted/60 text-muted-foreground/60 font-medium"
          )}
        >
          {count}
        </span>
      )}
    </motion.button>
  );
}

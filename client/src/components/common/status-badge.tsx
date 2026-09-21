import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type DocumentStatusValue = "VALID" | "EXPIRING_SOON" | "EXPIRED" | null | undefined;

const CONFIG_BY_DOC_STATUS: Record<
  "VALID" | "EXPIRING_SOON" | "EXPIRED",
  { bg: string; dot: string; ping?: string; text: string; border: string; pulse?: boolean }
> = {
  VALID: {
    bg: "bg-emerald-500/10 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]",
    ping: "bg-emerald-400",
  },
  EXPIRING_SOON: {
    bg: "bg-amber-500/10 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
    dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]",
    ping: "bg-amber-400",
    pulse: true,
  },
  EXPIRED: {
    bg: "bg-rose-500/10 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/30",
    dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]",
    ping: "bg-rose-400",
    pulse: true,
  },
};

export function StatusBadge({ status }: { status: DocumentStatusValue }) {
  const { t } = useTranslation();
  if (!status) return <span className="text-muted-foreground">—</span>;

  const cfg = CONFIG_BY_DOC_STATUS[status];
  if (!cfg) return <span className="text-muted-foreground">{status}</span>;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-tight transition-colors shadow-2xs",
        cfg.bg,
        cfg.text,
        cfg.border
      )}
    >
      <span className="relative flex h-2 w-2">
        {cfg.pulse && (
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", cfg.ping)} />
        )}
        <span className={cn("relative inline-flex rounded-full h-2 w-2", cfg.dot)} />
      </span>
      {t(`status.${status}`)}
    </span>
  );
}

export function EmploymentStatusBadge({ status }: { status: string | null | undefined }) {
  const { t } = useTranslation();
  if (!status) return <span className="text-muted-foreground">—</span>;

  const isAct = status === "ACTIVE";
  const isTerm = status === "TERMINATED";
  const isLeave = status === "ON_LEAVE";

  const styleClass = isAct
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    : isTerm
    ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
    : isLeave
    ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30"
    : "bg-muted/80 text-muted-foreground border-border/80";

  const dotClass = isAct
    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
    : isTerm
    ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
    : isLeave
    ? "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]"
    : "bg-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-tight shadow-2xs",
        styleClass
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClass)} />
      {t(`status.${status}`, { defaultValue: status })}
    </span>
  );
}

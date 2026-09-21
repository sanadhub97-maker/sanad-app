import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/80 bg-card/40 py-16 px-4 text-center backdrop-blur-sm", className)}>
      <div className="relative flex items-center justify-center">
        {/* Soft background glow rings */}
        <div className="absolute h-20 w-20 rounded-full bg-primary/10 blur-xl" />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/10 via-accent/10 to-primary/5 border border-primary/20 shadow-inner">
          <Icon className="h-7 w-7 text-primary" />
        </div>
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className="text-base font-bold text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}


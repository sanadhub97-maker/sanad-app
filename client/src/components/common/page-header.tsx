import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60", className)}>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-blue-600 via-indigo-600 to-cyan-500 shadow-[0_0_8px_rgba(37,99,235,0.6)] shrink-0" />
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-sans">
            {title}
          </h1>
        </div>
        {description && (
          <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-2xl leading-relaxed ps-3.5">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

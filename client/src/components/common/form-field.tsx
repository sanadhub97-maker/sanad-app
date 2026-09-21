import React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  required,
  hint,
  error,
  icon: Icon,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />}
          <span>{label}</span>
          {required && (
            <span className="text-rose-500 dark:text-rose-400 text-sm font-black leading-none">*</span>
          )}
        </label>
        {hint && (
          <span className="text-[11px] font-medium text-muted-foreground/80 bg-muted/40 px-1.5 py-0.5 rounded-md">
            {hint}
          </span>
        )}
      </div>
      <div className="relative">{children}</div>
      {error && (
        <p className="text-[11px] font-semibold text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-rose-500" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

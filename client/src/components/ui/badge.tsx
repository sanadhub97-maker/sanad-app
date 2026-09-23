import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-tight transition-colors shadow-2xs",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground",
        secondary:
          "border-border/80 bg-muted/80 text-muted-foreground",
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-950/40",
        warning:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 dark:bg-amber-950/40",
        destructive:
          "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 dark:bg-rose-950/40",
        info:
          "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 dark:bg-sky-950/40",
        outline:
          "border-border/80 text-foreground bg-background/50",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

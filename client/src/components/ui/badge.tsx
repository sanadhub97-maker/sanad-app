import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground",
        secondary:
          "bg-muted text-muted-foreground",
        success:
          "bg-success/10 text-success",
        warning:
          "bg-warning/10 text-warning",
        destructive:
          "bg-destructive/10 text-destructive",
        info:
          "bg-accent text-accent-foreground",
        outline:
          "border-border text-foreground bg-card",
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

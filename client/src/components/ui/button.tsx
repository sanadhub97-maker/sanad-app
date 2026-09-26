import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "relative overflow-hidden bg-primary bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(0,0,0,0.14))] text-primary-foreground shadow-[0_10px_24px_-12px_hsl(var(--primary))] hover:brightness-110 active:shadow-sm",
        destructive:
          "relative overflow-hidden bg-destructive text-destructive-foreground shadow-md shadow-destructive/20 hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/30 active:shadow-sm",
        outline:
          "border border-border/80 bg-background/80 backdrop-blur-sm shadow-2xs hover:bg-muted/80 hover:text-foreground hover:border-border",
        secondary:
          "bg-secondary/90 text-secondary-foreground shadow-2xs hover:bg-secondary active:shadow-none",
        ghost:
          "hover:bg-muted/70 hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        gradient:
          "relative overflow-hidden bg-[linear-gradient(180deg,#2cc3f7,#0090cc)] text-white shadow-[0_10px_24px_-10px_rgba(0,144,204,0.9)] hover:brightness-110 active:scale-[0.97]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-8 text-base",
        icon: "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

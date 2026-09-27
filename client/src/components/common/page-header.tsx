import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { usePageHeaderSlots } from "@/components/layout/page-header-slot";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** A page's title, description and actions. Inside the app shell they show in
 * the top row next to the logo (the Oasis header); elsewhere, in place. */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  const slots = usePageHeaderSlots();

  const heading = (
    <div className="flex min-w-0 flex-col gap-0.5">
      <h1 className="lux-title truncate font-head text-2xl font-semibold leading-tight text-foreground sm:text-[30px]">{title}</h1>
      {description && <p className="line-clamp-2 text-[13px] text-muted-foreground sm:text-sm">{description}</p>}
    </div>
  );
  const buttons = actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null;

  if (slots?.title) {
    return (
      <>
        {createPortal(heading, slots.title)}
        {buttons && slots.actions && createPortal(buttons, slots.actions)}
      </>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      {heading}
      {buttons}
    </div>
  );
}

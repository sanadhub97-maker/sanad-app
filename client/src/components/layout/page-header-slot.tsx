import { createContext, useContext, useState, type ReactNode } from "react";

/* The Oasis header puts each page's title and actions in the app's top row,
   next to the logo. The shell owns the two slots; PageHeader portals into
   them (and renders in place when no shell is around). */

interface Slots {
  title: HTMLElement | null;
  actions: HTMLElement | null;
  setTitle: (el: HTMLElement | null) => void;
  setActions: (el: HTMLElement | null) => void;
}

const PageHeaderSlotContext = createContext<Slots | null>(null);

export function PageHeaderSlotProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<HTMLElement | null>(null);
  const [actions, setActions] = useState<HTMLElement | null>(null);
  return (
    <PageHeaderSlotContext.Provider value={{ title, actions, setTitle, setActions }}>{children}</PageHeaderSlotContext.Provider>
  );
}

export function usePageHeaderSlots() {
  return useContext(PageHeaderSlotContext);
}

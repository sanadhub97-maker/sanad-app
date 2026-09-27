import { useEffect, useState } from "react";

/** A computer: a wide screen and a mouse. Phones and tablets are not. Matches
 * the `desk` Tailwind screen. */
export const DESK_QUERY = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";

export function useIsDesk() {
  const [desk, setDesk] = useState(() => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(DESK_QUERY).matches);
  useEffect(() => {
    if (!window.matchMedia) return;
    const m = window.matchMedia(DESK_QUERY);
    const on = () => setDesk(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return desk;
}

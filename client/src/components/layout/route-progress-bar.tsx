import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/** A thin light in the new page's colour that sweeps across the top on every page change (CSS only). */
export function RouteProgressBar() {
  const location = useLocation();
  const [run, setRun] = useState(0);

  useEffect(() => {
    setRun((n) => n + 1);
  }, [location.pathname, location.search]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2.5px] overflow-hidden">
      {run > 1 && <div key={run} className="lu-progress h-full w-full" style={{ background: "var(--page-c, #2563eb)" }} />}
    </div>
  );
}

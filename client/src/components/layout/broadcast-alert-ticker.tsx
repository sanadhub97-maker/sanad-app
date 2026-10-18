import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { alertsApi, type LiveAlert } from "@/api/alerts";

export function BroadcastAlertTicker() {
  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: alertsApi.list,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Filter only pending (unacknowledged) alerts or recent alerts
  const displayAlerts = useMemo(() => {
    const list = alerts.filter((a) => !a.acknowledged);
    if (list.length > 0) return list;
    return alerts.slice(0, 8);
  }, [alerts]);

  if (!displayAlerts || displayAlerts.length === 0) {
    return null;
  }

  // Double list to enable smooth infinite continuous marquee loop
  const duplicated = [...displayAlerts, ...displayAlerts];

  return (
    <div className="rx-ticker-shell no-print" aria-label="شريط البث والتنبيهات المباشرة">
      <div className="rx-ticker-badge">
        <span className="rx-ticker-dot" aria-hidden="true" />
        <span>شريط البث</span>
        <span className="rx-ticker-count">{displayAlerts.length} تنبيهات</span>
      </div>

      <div className="rx-ticker-marquee">
        <div className="rx-ticker-content">
          {duplicated.map((alert: LiveAlert, idx: number) => {
            const isExpired = alert.status === "EXPIRED" || alert.severity === "high" || alert.severity === "critical";
            const dateStr = alert.due ? alert.due.slice(0, 10).split("-").reverse().join("/") : "";

            return (
              <span key={`${alert.key}-${idx}`} className="contents">
                <Link to={alert.href || "/notifications"} className="rx-ticker-item">
                  <span className={`rx-item-dot ${isExpired ? "danger" : "warning"}`} aria-hidden="true" />
                  <span className={`rx-item-badge ${isExpired ? "danger" : "warning"}`}>
                    {isExpired ? "منتهية" : "قريبة الانتهاء"}
                  </span>
                  <span className="rx-item-text">
                    <b>{alert.title}</b>
                  </span>
                  {dateStr && <span className="rx-item-time">{dateStr}</span>}
                </Link>
                <span className="rx-ticker-sep" aria-hidden="true" />
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}


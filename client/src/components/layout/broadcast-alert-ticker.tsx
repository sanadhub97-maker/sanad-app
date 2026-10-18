import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronLeft, Gauge } from "lucide-react";
import { alertsApi } from "@/api/alerts";
import { dashboardApi } from "@/api/dashboard";

interface DisplayAlertItem {
  id: string;
  title: string;
  badge: string;
  isExpired: boolean;
  timeStr: string;
  href: string;
}

export function BroadcastAlertTicker() {
  const [speedSec, setSpeedSec] = useState<number>(() => {
    try {
      return Number(localStorage.getItem("sanad.ticker.speed")) || 38;
    } catch {
      return 38;
    }
  });

  const changeSpeed = (next: number) => {
    setSpeedSec(next);
    try {
      localStorage.setItem("sanad.ticker.speed", String(next));
    } catch {
      /* private mode */
    }
  };

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: alertsApi.list,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: overview } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Consolidate unacknowledged alerts or urgent expiring documents
  const displayItems = useMemo<DisplayAlertItem[]>(() => {
    // 1. Direct unacknowledged alerts from /api/alerts
    const unacked = alerts.filter((a) => !a.acknowledged);
    if (unacked.length > 0) {
      return unacked.map((a, i) => {
        const isExpired = a.status === "EXPIRED" || a.severity === "high" || a.severity === "critical";
        const dateStr = a.due ? a.due.slice(0, 10).split("-").reverse().join("/") : "";
        return {
          id: `${a.key}-${i}`,
          title: a.title,
          badge: isExpired ? "منتهية" : "قريبة الانتهاء",
          isExpired,
          timeStr: dateStr,
          href: a.href || "/notifications",
        };
      });
    }

    // 2. Documents needing attention from dashboard overview
    if (overview?.attention && overview.attention.length > 0) {
      return overview.attention.slice(0, 12).map((att, i) => {
        const isExpired = att.days < 0;
        const daysText = att.days < 0 ? `منتهية (${Math.abs(att.days)} يوم)` : `متبقي ${att.days} يوم`;
        let targetHref = "/employee-documents";
        if (att.sourceType === "COMPANY_DOCUMENT") targetHref = "/company-documents";
        if (att.sourceType === "VEHICLE") targetHref = "/vehicles";

        return {
          id: `att-${att.key || i}`,
          title: `${att.documentAr || "وثيقة"} - ${att.nameAr || "المؤسسة"}${att.documentNumber ? ` [${att.documentNumber}]` : ""}`,
          badge: daysText,
          isExpired,
          timeStr: isExpired ? "تحتاج تجديد فوراً" : "قيد المتابعة",
          href: targetHref,
        };
      });
    }

    // 3. Fallback when all documents and licenses are valid
    return [
      {
        id: "status-ok",
        title: "جميع الوثائق والتراخيص الرسمية سارية وبحالة ممتازة • نظام المتابعة والتنبيه التلقائي مفعل",
        badge: "سارية 100%",
        isExpired: false,
        timeStr: "تحديث مباشر",
        href: "/notifications",
      },
    ];
  }, [alerts, overview]);

  // Double list to enable smooth infinite continuous marquee loop
  const duplicated = [...displayItems, ...displayItems];

  return (
    <div
      className="rx-ticker-shell no-print"
      aria-label="شريط التنبيهات الملكي المباشر"
      style={{ ["--rx-ticker-speed" as string]: `${speedSec}s` }}
    >
      {/* 24K Polished Gold Badge: التنبيهات */}
      <div className="rx-ticker-badge" title="تنبيهات الوثائق والتراخيص المنتهية والقريبة">
        <span className="rx-ticker-gem" aria-hidden="true" />
        <Bell className="rx-ticker-bell" aria-hidden="true" />
        <span className="rx-ticker-label">التنبيهات</span>
        <span className="rx-ticker-count">{displayItems.length}</span>
      </div>

      {/* Marquee Track */}
      <div className="rx-ticker-marquee">
        <div className="rx-ticker-content">
          {duplicated.map((item: DisplayAlertItem, idx: number) => (
            <span key={`${item.id}-${idx}`} className="contents">
              <Link to={item.href} className="rx-ticker-item">
                <span className={`rx-item-dot ${item.isExpired ? "danger" : "warning"}`} aria-hidden="true" />
                <span className={`rx-item-badge ${item.isExpired ? "danger" : "warning"}`}>
                  {item.badge}
                </span>
                <span className="rx-item-text">
                  <b>{item.title}</b>
                </span>
                {item.timeStr && <span className="rx-item-time">{item.timeStr}</span>}
              </Link>
              <span className="rx-ticker-sep" aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>

      {/* Left Tools & Quick Action */}
      <div className="rx-ticker-tools">
        <button
          type="button"
          className="rx-ticker-speed-btn"
          onClick={() => {
            // Cycle through: 38s (معتدل) -> 22s (سريع) -> 55s (هادئ)
            const next = speedSec === 38 ? 22 : speedSec === 22 ? 55 : 38;
            changeSpeed(next);
          }}
          title={`السرعة الحالية: ${speedSec === 22 ? "سريعة (22s)" : speedSec === 55 ? "هادئة (55s)" : "معتدلة (38s)"} — انقر لتغيير السرعة`}
        >
          <Gauge className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{speedSec === 22 ? "سريع" : speedSec === 55 ? "هادئ" : "معتدل"}</span>
        </button>

        <Link to="/notifications" className="rx-ticker-action" title="عرض كافة التنبيهات والإشعارات">
          <span>عرض الكل</span>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}



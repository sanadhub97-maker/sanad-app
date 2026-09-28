import { useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, Check, Clock, Info } from "lucide-react";
import { notificationsApi } from "@/api/notifications";
import { cn, formatDateTime } from "@/lib/utils";

const SEVERITY: Record<string, { tone: string; icon: typeof Bell }> = {
  CRITICAL: { tone: "rose", icon: AlertTriangle },
  WARNING: { tone: "amber", icon: Clock },
  INFO: { tone: "sky", icon: Info },
};

export function useNotificationsBell() {
  return useQuery({
    queryKey: ["notifications", "bell"],
    queryFn: () => notificationsApi.list({ page: 1, pageSize: 8 }),
    refetchInterval: 60_000,
  });
}

/** The notifications panel that springs open under the bell. */
export function LuluNotifications({ open, anchor, onClose }: { open: boolean; anchor: HTMLElement | null; onClose: () => void }) {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useNotificationsBell();
  const unread = data?.unreadCount ?? 0;
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 12, top: 88 });

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const w = Math.min(380, window.innerWidth - 24);
    const rtl = document.documentElement.dir !== "ltr";
    const left = rtl ? r.left : r.right - w;
    setPos({ left: Math.max(12, Math.min(left, window.innerWidth - w - 12)), top: r.bottom + 10 });
  }, [open, anchor]);

  useLayoutEffect(() => {
    if (!open) return;
    function away(e: MouseEvent) {
      const t = e.target as Node;
      if (anchor?.contains(t) || document.querySelector(".lu-npanel")?.contains(t)) return;
      onClose();
    }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open, anchor, onClose]);

  async function markAllRead() {
    await notificationsApi.markAllRead();
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }
  const openAll = () => {
    onClose();
    navigate("/notifications");
  };

  return (
    <div className={cn("lu-npanel", open && "open")} style={{ left: pos.left, top: pos.top }} role="dialog" aria-label={isAr ? "الإشعارات" : "Notifications"}>
      <div className="lu-hd lt-rose">
        <h2>{isAr ? "الإشعارات" : "Notifications"}</h2>
        {unread > 0 && <span className="lu-note">{isAr ? `${unread} جديدة` : `${unread} new`}</span>}
      </div>
      {!data || data.data.length === 0 ? (
        <div className="lu-cmd-e">
          <Bell className="mx-auto mb-2 h-8 w-8 opacity-40" />
          {isAr ? "لا توجد إشعارات حاليًا." : "No notifications yet."}
        </div>
      ) : (
        data.data.map((n, k) => {
          const s = SEVERITY[n.severity] ?? SEVERITY.INFO;
          const Icon = s.icon;
          return (
            <button key={n.id} type="button" onClick={openAll} className={cn("lu-nitem", `lt-${s.tone}`, !n.isRead && "unread")} style={{ ["--k" as string]: k }}>
              <span className="lu-ci">
                <Icon />
              </span>
              <span className="lu-cell">
                <b>{n.title}</b>
                <small className="line-clamp-2">{n.message}</small>
                <small>{formatDateTime(n.createdAt)}</small>
              </span>
            </button>
          );
        })
      )}
      <div className="mt-2.5 flex gap-2">
        {unread > 0 && (
          <button type="button" className="lu-sbtn lt-green" style={{ color: "var(--c)" }} onClick={markAllRead}>
            <Check className="h-4 w-4" /> {isAr ? "تحديد الكل كمقروء" : "Mark all read"}
          </button>
        )}
        <button type="button" className="lu-sbtn lt-sky" style={{ color: "var(--c)" }} onClick={openAll}>
          {isAr ? "عرض كل الإشعارات" : "View all"}
        </button>
      </div>
    </div>
  );
}

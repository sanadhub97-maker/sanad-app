import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { notificationsApi } from "@/api/notifications";
import { cn, formatDateTime } from "@/lib/utils";

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: "bg-rose-500 ring-rose-400/30",
  WARNING: "bg-amber-500 ring-amber-400/30",
  INFO: "bg-blue-500 ring-blue-400/30",
};

export function NotificationBell() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["notifications", "bell"],
    queryFn: () => notificationsApi.list({ page: 1, pageSize: 8 }),
    refetchInterval: 60_000,
  });

  async function markAllRead() {
    await notificationsApi.markAllRead();
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  const unread = data?.unreadCount ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground dark:hover:bg-white/[0.08] transition-colors"
          title={isAr ? "الإشعارات" : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white ring-2 ring-card animate-in zoom-in-50">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 rounded-2xl shadow-luxury border-border/80 glass-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 bg-muted/40">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {isAr ? "مركز الإشعارات" : "Notifications"}
            </span>
            {unread > 0 && (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-500">
                {unread} {isAr ? "جديد" : "new"}
              </span>
            )}
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs font-medium text-primary hover:bg-primary/10"
              onClick={markAllRead}
            >
              <Check className="h-3.5 w-3.5 me-1" /> {isAr ? "تحديد الكل كمقروء" : "Mark all read"}
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
          {!data || data.data.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">
                {isAr ? "لا توجد إشعارات جديدة حالياً." : "No new notifications."}
              </p>
            </div>
          ) : (
            data.data.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex gap-3 p-3.5 text-xs transition-colors hover:bg-muted/50 cursor-pointer",
                  !n.isRead && "bg-primary/[0.03]"
                )}
                onClick={() => navigate("/notifications")}
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full ring-4",
                    SEVERITY_DOT[n.severity] ?? "bg-blue-500 ring-blue-400/30"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-semibold leading-snug", !n.isRead ? "text-foreground" : "text-muted-foreground")}>
                    {n.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground/70">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border/70 p-2 bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground h-8 rounded-lg"
            onClick={() => navigate("/notifications")}
          >
            {isAr ? "عرض كل الإشعارات" : "View all notifications"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}


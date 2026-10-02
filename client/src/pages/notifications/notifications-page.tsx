import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { notificationsApi } from "@/api/notifications";
import { cn, formatDateTime } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import { notificationText } from "@/types/models";
import { LiveAlerts } from "@/pages/productivity/productivity-page";

const SEVERITY_DOT: Record<string, string> = { CRITICAL: "bg-destructive", WARNING: "bg-warning", INFO: "bg-info" };

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const queryClient = useQueryClient();
  const [severity, setSeverity] = useState("");
  const [isRead, setIsRead] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState("current");

  const params = { page, pageSize: 20, severity: severity || undefined, isRead: isRead || undefined };
  const { data, isLoading } = useQuery({ queryKey: ["notifications", "page", params], queryFn: () => notificationsApi.list(params) });

  async function markRead(id: string) {
    try { await notificationsApi.markRead(id); await queryClient.invalidateQueries({ queryKey: ["notifications"] }); }
    catch (err) { toast.error(getErrorMessage(err)); }
  }
  async function remove(id: string) {
    try {
      await notificationsApi.remove(id);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(t("common.deletedSuccess"));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }
  async function markAllRead() {
    try { await notificationsApi.markAllRead(); await queryClient.invalidateQueries({ queryKey: ["notifications"] }); }
    catch (err) { toast.error(getErrorMessage(err)); }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("notifications.title")}
        description={t("notifications.subtitle")}
        actions={view === "history" ?
          <>
            <Select value={severity || "all"} onValueChange={(v) => setSeverity(v === "all" ? "" : v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t("notifications.filters.severity")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="CRITICAL">{t("notifications.filters.critical")}</SelectItem>
                <SelectItem value="WARNING">{t("notifications.filters.warning")}</SelectItem>
                <SelectItem value="INFO">{t("notifications.filters.information")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={isRead || "all"} onValueChange={(v) => setIsRead(v === "all" ? "" : v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t("common.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="false">{t("notifications.filters.unread")}</SelectItem>
                <SelectItem value="true">{t("notifications.filters.read")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={markAllRead}>
              <Check className="h-4 w-4" /> {t("notifications.markAllRead")}
            </Button>
          </> : undefined
        }
      />

      <div className="flex gap-2"><Button variant={view === "current" ? "default" : "outline"} onClick={() => setView("current")}>{isAr ? "التنبيهات الحالية والمتأخرة" : "Current & overdue alerts"}</Button><Button variant={view === "history" ? "default" : "outline"} onClick={() => setView("history")}>{isAr ? "سجل الإشعارات" : "Notification history"}</Button></div>
      {view === "current" && <LiveAlerts />}
      {view === "history" && (isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : !data || data.data.length === 0 ? (
        <EmptyState icon={Bell} title={t("notifications.empty")} description={t("notifications.noneYet")} />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {data.data.map((n) => (
              <div key={n.id} className={cn("flex items-start gap-3 p-4", !n.isRead && "bg-muted/40")}>
                <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", SEVERITY_DOT[n.severity])} />
                <div className="flex-1">
                  <p className="font-medium">{notificationText(n, isAr).title}</p>
                  <p className="text-sm text-muted-foreground">{notificationText(n, isAr).message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                </div>
                <div className="flex gap-1">
                  {!n.isRead && (
                    <Button variant="ghost" size="icon" onClick={() => markRead(n.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => remove(n.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {view === "history" && data && data.meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {t("common.previous")}
          </Button>
          <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            {t("common.next")}
          </Button>
        </div>
      )}
    </div>
  );
}

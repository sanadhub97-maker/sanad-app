import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Edit, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { LuPager } from "@/components/lulu/lulu-ui";
import { usersApi } from "@/api/users";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { UserDialog } from "@/pages/users/user-dialog";
import { translateRoleName } from "@/lib/role-display";
import type { AppUser } from "@/types/models";
import { UserAvatar } from "@/components/lulu/user-avatar";
import { tr } from "@/i18n";
import { DayHeader, Kpis, Pill, daysFromToday, dmy, groupByDay, relDay, weekday, type Tone } from "@/components/royal/rp";

/* Users in the Royal design, as in the approved preview: the summary band, a
   table with each account's roles, last sign-in and an on/off switch, and
   below it who signed in on which day. */

const ROLE_TONES: Tone[] = ["pri", "vio", "gold", "teal", "sky", "mut"];

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; user?: AppUser }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["users", { page, search, pageSize }],
    queryFn: () => usersApi.list({ page, pageSize, q: search || undefined }),
  });
  const users = data?.data ?? [];
  const total = data?.meta.total ?? users.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const roleTone = new Map<string, Tone>();
  users.flatMap((u) => u.roles).forEach((r) => !roleTone.has(r.id) && roleTone.set(r.id, ROLE_TONES[roleTone.size % ROLE_TONES.length]));
  const signedToday = users.filter((u) => daysFromToday(u.lastLoginAt) === 0).length;
  const activity = groupByDay(users, (u) => u.lastLoginAt);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await usersApi.remove(deleteTarget.id);
      toast.success(t("common.deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function toggleActive(u: AppUser) {
    setBusy(u.id);
    try {
      await usersApi.update(u.id, { isActive: !u.isActive });
      toast.success(u.isActive ? tr(`تم إيقاف حساب ${u.fullName}`, `${u.fullName}'s account was turned off`) : tr(`تم تفعيل حساب ${u.fullName}`, `${u.fullName}'s account was turned on`));
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rp">
      <PageHeader
        title={t("users.title")}
        description={tr(`${total} مستخدم · ${users.filter((u) => u.isActive).length} مفعّل`, `${total} users · ${users.filter((u) => u.isActive).length} active`)}
        actions={
          hasPermission("users.create") && (
            <Button onClick={() => setDialog({ open: true })}>
              <Plus className="h-4 w-4" /> {t("users.addUser")}
            </Button>
          )
        }
      />

      <Kpis
        items={[
          { label: tr("المستخدمون", "Users"), value: total, sub: tr("لهم دخول على النظام", "Who can sign in"), hero: true },
          { label: tr("حسابات مفعّلة", "Active accounts"), value: users.filter((u) => u.isActive).length, sub: tr("يقدروا يدخلوا الآن", "Can sign in now"), tone: "ok" },
          { label: tr("حسابات موقوفة", "Turned off"), value: users.filter((u) => !u.isActive).length, sub: tr("لا يمكنهم الدخول", "Cannot sign in"), tone: "mut" },
          { label: tr("دخلوا اليوم", "Signed in today"), value: signedToday, sub: tr("آخر دخول اليوم", "Last sign-in today"), tone: "pri" },
        ]}
      />

      <div className="rp-tools rp-rise no-print" style={{ ["--i" as string]: 2 }}>
        <label className="rp-search">
          <Search />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={tr("الاسم أو البريد", "Name or email")}
            aria-label={tr("بحث", "Search")}
          />
        </label>
      </div>

      {isLoading ? (
        <div className="rp-card rp-empty">{t("common.loading")}</div>
      ) : users.length === 0 ? (
        <div className="rp-card rp-empty rp-rise">
          <b>{t("users.emptyTitle")}</b>
          {hasPermission("users.create") && (
            <div className="mt-3">
              <Button size="sm" onClick={() => setDialog({ open: true })}>
                <UserPlus className="h-4 w-4" /> {t("users.addUser")}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rp-card rp-tw rp-rise" style={{ ["--i" as string]: 3 }}>
          <table className="rp-tbl">
            <thead>
              <tr>
                <th>{t("users.table.fullName")}</th>
                <th>{t("users.table.roles")}</th>
                <th className="hide-sm">{t("users.table.lastLogin")}</th>
                <th>{tr("الحساب", "Account")}</th>
                <th className="hide-sm" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const me = u.id === currentUser?.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="rp-person">
                        <UserAvatar name={u.fullName} fileId={u.avatarFileId} avatarKey={u.avatarKey} size={38} />
                        <div className="min-w-0">
                          <b>
                            {u.fullName}
                            {me && <span className="ms-1 text-[11px] font-semibold text-[var(--l-muted)]">({tr("أنت", "you")})</span>}
                          </b>
                          <small className="rp-mono">{u.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Pill key={r.id} tone={roleTone.get(r.id)} dot={false}>
                            {translateRoleName(r.name, t)}
                          </Pill>
                        ))}
                      </div>
                    </td>
                    <td className="hide-sm">
                      {u.lastLoginAt ? (
                        <>
                          {weekday(u.lastLoginAt)} <span className="rp-num">{dmy(u.lastLoginAt)}</span>
                          <small className="block text-[11.5px] text-[var(--l-muted)]">{relDay(u.lastLoginAt)}</small>
                        </>
                      ) : (
                        <span className="text-[var(--l-muted)]">{t("users.table.never")}</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        role="switch"
                        className="rp-sw"
                        aria-checked={u.isActive}
                        aria-label={u.isActive ? tr(`إيقاف حساب ${u.fullName}`, `Turn off ${u.fullName}`) : tr(`تفعيل حساب ${u.fullName}`, `Turn on ${u.fullName}`)}
                        title={me ? tr("لا يمكنك إيقاف حسابك", "You can't turn off your own account") : undefined}
                        disabled={me || !hasPermission("users.edit") || busy === u.id}
                        onClick={() => toggleActive(u)}
                      />
                    </td>
                    <td className="hide-sm">
                      <div className="flex justify-end gap-1">
                        {hasPermission("users.edit") && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setDialog({ open: true, user: u })} aria-label={t("common.edit")}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission("users.delete") && !me && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(u)} aria-label={t("common.delete")}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <LuPager page={page} pages={pages} onChange={setPage} isAr={isAr} />

      {activity.length > 0 && (
        <>
          <div className="rp-sec rp-rise" style={{ ["--i" as string]: 4 }}>
            <h2>
              <Clock />
              {tr("الدخول باليوم", "Sign-ins by day")}
            </h2>
            <p>{tr("آخر دخول لكل مستخدم", "Each user's last sign-in")}</p>
          </div>
          <div className="rp-card rp-rise overflow-hidden" style={{ ["--i" as string]: 5 }}>
            {activity.map((g) => (
              <div key={g.day.toISOString()}>
                <DayHeader
                  day={g.day}
                  right={
                    <>
                      <b>{g.items.length}</b>
                      {tr("مستخدم", g.items.length === 1 ? "user" : "users")}
                    </>
                  }
                />
                {g.items.map((u) => (
                  <div key={u.id} className="rp-item">
                    <UserAvatar name={u.fullName} fileId={u.avatarFileId} avatarKey={u.avatarKey} size={34} />
                    <span className="t">
                      <b>{u.fullName}</b>
                      <small>{u.roles.map((r) => translateRoleName(r.name, t)).join("، ") || "—"}</small>
                    </span>
                    <span className="end">
                      <small>
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleTimeString(isAr ? "ar-EG-u-nu-latn" : "en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <UserDialog open={dialog.open} user={dialog.user} onOpenChange={(open) => setDialog({ open })} />
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title={t("users.deleteConfirmTitle")} onConfirm={handleDelete} />
    </div>
  );
}

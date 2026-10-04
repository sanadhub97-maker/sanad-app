import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Edit, KeyRound, Lock, Plus, Save, Shield, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { rolesApi } from "@/api/roles";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { translateRoleName } from "@/lib/role-display";
import { RoleDialog } from "@/pages/roles/role-dialog";
import { tr } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/models";
import type { Tone } from "@/components/royal/rp";

/* Roles in the Royal design, as in the approved preview: the roles on one
   side, and the selected role's permissions as a table of section × action
   that can be ticked and saved here (system roles stay as they are). */

const ACTIONS: Record<string, [string, string]> = {
  view: ["عرض", "View"], create: ["إضافة", "Create"], edit: ["تعديل", "Edit"], delete: ["حذف", "Delete"],
  export: ["تصدير", "Export"], import: ["استيراد", "Import"], download: ["تنزيل", "Download"], upload: ["رفع", "Upload"],
  manage: ["إدارة", "Manage"], print: ["طباعة", "Print"], send: ["إرسال", "Send"], approve: ["اعتماد", "Approve"], pay: ["سداد", "Pay"],
};
const ORDER = ["view", "create", "edit", "delete", "pay", "export", "import", "upload", "download", "print", "manage", "send", "approve"];
const TONES: Tone[] = ["pri", "vio", "gold", "teal", "sky", "ok", "mut"];

export default function RolesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [dialog, setDialog] = useState<{ open: boolean; role?: Role }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: roles, isLoading } = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list });
  const { data: catalogue = [] } = useQuery({ queryKey: ["roles", "permissions"], queryFn: rolesApi.permissionsCatalogue, staleTime: 10 * 60_000 });

  const role = roles?.find((r) => r.id === selected) ?? roles?.[0];
  useEffect(() => setDraft(null), [role?.id]);
  const keys = draft ?? new Set(role?.permissionKeys ?? []);
  const editable = Boolean(role && !role.isSystem && hasPermission("roles.edit"));
  const dirty = Boolean(draft && role && (draft.size !== role.permissionKeys.length || role.permissionKeys.some((k) => !draft.has(k))));
  const actions = useMemo(() => {
    const all = new Set(catalogue.flatMap((m) => m.permissions.map((p) => p.action)));
    return [...all].sort((a, b) => (ORDER.indexOf(a) + 99) % 99 - (ORDER.indexOf(b) + 99) % 99 || a.localeCompare(b));
  }, [catalogue]);

  function toggle(key: string) {
    if (!editable) return;
    const next = new Set(keys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setDraft(next);
  }
  async function save() {
    if (!role || !draft) return;
    setSaving(true);
    try {
      await rolesApi.update(role.id, { permissionKeys: [...draft] });
      toast.success(tr("تم حفظ صلاحيات الدور", "Role permissions saved"));
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      setDraft(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await rolesApi.remove(deleteTarget.id);
      toast.success(t("common.deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setDeleteTarget(null);
      setSelected(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="rp">
      <PageHeader
        title={t("roles.title")}
        description={tr("مين يقدر يعمل إيه في كل قسم", "Who can do what in each section")}
        actions={
          hasPermission("roles.create") && (
            <Button onClick={() => setDialog({ open: true })}>
              <Plus className="h-4 w-4" /> {t("roles.addRole")}
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="rp-card rp-empty">{t("common.loading")}</div>
      ) : !roles || roles.length === 0 ? (
        <div className="rp-card rp-empty">
          <b>{t("roles.title")}</b>
        </div>
      ) : (
        <div className="rp-roles">
          <div className="rp-card rp-rl rp-rise" style={{ ["--i" as string]: 1 }} role="listbox" aria-label={t("roles.title")}>
            {roles.map((r, i) => (
              <button key={r.id} type="button" role="option" aria-selected={r.id === role?.id} aria-pressed={r.id === role?.id} onClick={() => setSelected(r.id)}>
                <span className={cn("rp-ico sm", `rp-${TONES[i % TONES.length]}`)}>{r.isSystem ? <Lock /> : <KeyRound />}</span>
                <span className="min-w-0 flex-1">
                  <b>{translateRoleName(r.name, t)}</b>
                  <small>
                    {t("roles.usersCount", { count: r.userCount })} · {t("roles.permissionsCount", { count: r.permissionKeys.length })}
                  </small>
                </span>
              </button>
            ))}
          </div>

          {role && (
            <div className="rp-card rp-rise overflow-hidden" style={{ ["--i" as string]: 2 }}>
              <div className="rp-sec border-b border-[var(--l-line)] px-[18px] py-4">
                <div className="min-w-0">
                  <h2>
                    <Shield />
                    {translateRoleName(role.name, t)}
                  </h2>
                  <p>
                    {role.isSystem
                      ? tr("دور النظام: صلاحياته ثابتة ولا تتعدل", "A system role: its permissions are fixed")
                      : editable
                        ? tr("اضغط على أي مربع لتغيير الصلاحية، ثم احفظ", "Tick a box to change a permission, then save")
                        : role.description || ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {dirty && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setDraft(null)}>
                        <Undo2 className="h-4 w-4" /> {tr("تراجع", "Undo")}
                      </Button>
                      <Button size="sm" onClick={save} disabled={saving}>
                        <Save className="h-4 w-4" /> {tr("حفظ الصلاحيات", "Save permissions")}
                      </Button>
                    </>
                  )}
                  {hasPermission("roles.edit") && !role.isSystem && (
                    <Button variant="outline" size="sm" onClick={() => setDialog({ open: true, role })}>
                      <Edit className="h-4 w-4" /> {tr("الاسم والوصف", "Name & description")}
                    </Button>
                  )}
                  {hasPermission("roles.delete") && !role.isSystem && (
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteTarget(role)}>
                      <Trash2 className="h-4 w-4" /> {t("common.delete")}
                    </Button>
                  )}
                </div>
              </div>
              <div className="rp-tw">
                <table className="rp-tbl">
                  <thead>
                    <tr>
                      <th>{tr("القسم", "Section")}</th>
                      {actions.map((a) => (
                        <th key={a} className="text-center">
                          {ACTIONS[a] ? tr(ACTIONS[a][0], ACTIONS[a][1]) : a}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catalogue.map((m) => (
                      <tr key={m.module}>
                        <td className="font-semibold">{t(`moduleNames.${m.module}`, { defaultValue: m.module })}</td>
                        {actions.map((a) => {
                          const p = m.permissions.find((x) => x.action === a);
                          if (!p) return <td key={a} />;
                          const on = keys.has(p.key);
                          return (
                            <td key={a} className="text-center">
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={on}
                                aria-label={`${t(`moduleNames.${m.module}`, { defaultValue: m.module })} - ${ACTIONS[a] ? tr(ACTIONS[a][0], ACTIONS[a][1]) : a}`}
                                disabled={!editable}
                                onClick={() => toggle(p.key)}
                                className={cn(
                                  "inline-grid h-[22px] w-[22px] place-items-center rounded-[7px] border-2 transition-colors",
                                  on ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white" : "border-[var(--l-line)] text-transparent",
                                  editable ? "cursor-pointer" : "cursor-default"
                                )}
                              >
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <RoleDialog open={dialog.open} role={dialog.role} onOpenChange={(open) => setDialog({ open })} />
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title={t("roles.deleteConfirmTitle")} onConfirm={handleDelete} />
    </div>
  );
}

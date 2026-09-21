import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, ShieldCheck, Trash2, Shield, Users, Key } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { AppleIcon } from "@/components/common/apple-icon";
import { rolesApi } from "@/api/roles";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { translateRoleName } from "@/lib/role-display";
import { RoleDialog } from "@/pages/roles/role-dialog";
import type { Role } from "@/types/models";

export default function RolesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [dialog, setDialog] = useState<{ open: boolean; role?: Role }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const { data: roles, isLoading } = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list });

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await rolesApi.remove(deleteTarget.id);
      toast.success(t("common.deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("roles.title")}
        description={t("roles.subtitle")}
        actions={
          hasPermission("roles.create") && (
            <Button onClick={() => setDialog({ open: true })} className="gap-2 shadow-sm font-semibold">
              <Plus className="h-4 w-4" /> {t("roles.addRole")}
            </Button>
          )
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : !roles || roles.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={t("roles.title")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Card
              key={role.id}
              className="rounded-2xl border-border/80 bg-card/90 shadow-luxury backdrop-blur-md specular-border card-luxury-hover overflow-hidden"
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <AppleIcon icon={Shield} tone={role.isSystem ? "purple" : "blue"} size="sm" />
                    <div>
                      <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                        {translateRoleName(role.name, t)}
                        {role.isSystem && (
                          <span className="rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold">
                            {t("roles.builtIn")}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {role.isSystem ? t("roles.systemRoleDescription") : role.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {hasPermission("roles.edit") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-muted"
                        onClick={() => setDialog({ open: true, role })}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission("roles.delete") && !role.isSystem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(role)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-500" />
                    {t("roles.usersCount", { count: role.userCount })}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <Key className="h-3.5 w-3.5 text-amber-500" />
                    {t("roles.permissionsCount", { count: role.permissionKeys.length })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RoleDialog open={dialog.open} role={dialog.role} onOpenChange={(open) => setDialog({ open })} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("roles.deleteConfirmTitle")}
        onConfirm={handleDelete}
      />
    </div>
  );
}

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Loader2,
  ShieldCheck,
  Shield,
  CheckCircle2,
  Lock,
  FileText,
  KeyRound,
  Check,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AppleIcon } from "@/components/common/apple-icon";
import { FormField } from "@/components/common/form-field";
import { rolesApi } from "@/api/roles";
import { getErrorMessage } from "@/lib/api";
import type { Role } from "@/types/models";

interface FormValues {
  name: string;
  description?: string;
  permissionKeys: string[];
}

export function RoleDialog({
  open,
  role,
  onOpenChange,
}: {
  open: boolean;
  role?: Role;
  onOpenChange: (o: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();
  const isEdit = Boolean(role);
  const { data: catalogue, isLoading: loadingCatalogue } = useQuery({
    queryKey: ["roles", "permissions-catalogue"],
    queryFn: rolesApi.permissionsCatalogue,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { permissionKeys: [] },
  });

  useEffect(() => {
    if (open) {
      reset(role ? { name: role.name, description: role.description ?? "", permissionKeys: role.permissionKeys } : { permissionKeys: [] });
    }
  }, [open, role, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => (isEdit ? rolesApi.update(role!.id, values) : rolesApi.create(values)),
    onSuccess: (res) => {
      toast.success(res.message ?? (isAr ? "تم حفظ مصفوفة الدور بنجاح" : "Role saved successfully"));
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-3xl border border-border/80 bg-card p-0 shadow-2xl sm:max-w-2xl max-h-[90vh] flex flex-col">
        {/* 🌟 Ambient Purple Tone Light Bleed */}
        <div className="pointer-events-none absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-purple-500/15 via-purple-500/5 to-transparent" />
        {/* 🌟 Top Specular Glass Sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent" />

        {/* 💎 Executive Header */}
        <div className="relative z-10 px-6 pt-6 pb-4 border-b border-border/50 bg-card/60 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <AppleIcon icon={ShieldCheck} tone="purple" size="md" className="shadow-sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-black tracking-tight text-foreground font-sans">
                  {isEdit ? (isAr ? "تعديل الدور والصلاحيات" : "Edit Role & Permissions") : (isAr ? "إضافة دور إداري جديد" : "Add New Role")}
                </DialogTitle>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  {isEdit ? (isAr ? "تعديل سجل" : "Edit") : (isAr ? "دور جديد" : "New Role")}
                </span>
                {role?.isSystem && (
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    <span>{isAr ? "دور نظام محمي" : "Protected System Role"}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAr ? "تحديد مسمى الدور وتخصيص مصفوفة الصلاحيات المتاحة للنظام" : "Specify role title and allocate granular system permissions"}
              </p>
            </div>
          </div>
        </div>

        {/* 📋 Form Body */}
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Section 1: Role Information */}
          <div className="rounded-2xl border border-border/60 bg-muted/25 dark:bg-muted/15 p-4 space-y-3.5">
            <div className="flex items-center gap-2 pb-1 text-xs font-bold text-foreground/80">
              <Shield className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>{isAr ? "تعريف الدور الإداري" : "Role Definition"}</span>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <FormField label={isAr ? "مسمى الدور" : "Role Name"} required error={errors.name ? (isAr ? "مطلوب" : "Required") : undefined} icon={Shield}>
                <Input
                  {...register("name", { required: true })}
                  disabled={role?.isSystem}
                  placeholder={isAr ? "مثال: مدير الموارد البشرية" : "e.g. HR Manager"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/70 focus:border-purple-500/60 focus:ring-4 focus:ring-purple-500/10"
                />
              </FormField>

              <FormField label={isAr ? "الوصف الإداري" : "Description"} icon={FileText}>
                <Input
                  {...register("description")}
                  placeholder={isAr ? "وصف مختصر للمهام المنوطة بهذا الدور" : "Brief description of role responsibilities"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/70"
                />
              </FormField>
            </div>
          </div>

          {/* Section 2: Granular Permissions Matrix */}
          <div className="rounded-2xl border border-border/60 bg-muted/25 dark:bg-muted/15 p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground/80">
                <KeyRound className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                <span>{isAr ? "مصفوفة الصلاحيات المتاحة للنظام" : "System Permissions Matrix"}</span>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {isAr ? "حدد صلاحيات الوصول لكل موديول" : "Toggle access rights per module"}
              </span>
            </div>

            <Controller
              control={control}
              name="permissionKeys"
              render={({ field }) => (
                <div className="space-y-3 max-h-72 overflow-y-auto pe-1">
                  {loadingCatalogue ? (
                    <div className="flex items-center justify-center p-6 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin me-2 text-primary" />
                      <span>{isAr ? "جاري تحميل جدول الصلاحيات..." : "Loading permissions catalogue..."}</span>
                    </div>
                  ) : (
                    (catalogue ?? []).map((group) => {
                      const selected = new Set(field.value);
                      const allChecked = group.permissions.every((p) => selected.has(p.key));

                      return (
                        <div key={group.module} className="rounded-xl border border-border/60 bg-card/80 p-3.5 shadow-2xs transition-all">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
                            <div className="flex items-center gap-2">
                              <Shield className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                              <span className="text-xs font-bold text-foreground">
                                {t(`moduleNames.${group.module}`, { defaultValue: group.module.replace(/([A-Z])/g, " $1") })}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                ({group.permissions.filter((p) => selected.has(p.key)).length}/{group.permissions.length})
                              </span>
                            </div>
                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 cursor-pointer select-none">
                              <Checkbox
                                checked={allChecked}
                                onCheckedChange={(checked) => {
                                  const next = new Set(selected);
                                  group.permissions.forEach((p) => (checked ? next.add(p.key) : next.delete(p.key)));
                                  field.onChange(Array.from(next));
                                }}
                              />
                              <span>{isAr ? "تحديد الكل" : "Select All"}</span>
                            </label>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {group.permissions.map((perm) => {
                              const isChecked = selected.has(perm.key);
                              return (
                                <div
                                  key={perm.key}
                                  onClick={() => {
                                    const next = new Set(selected);
                                    isChecked ? next.delete(perm.key) : next.add(perm.key);
                                    field.onChange(Array.from(next));
                                  }}
                                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                                    isChecked
                                      ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 font-semibold ring-1 ring-purple-500/10"
                                      : "bg-background/70 border-border/50 hover:bg-background text-foreground"
                                  }`}
                                >
                                  <div
                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-all ${
                                      isChecked
                                        ? "bg-purple-600 border-purple-600 text-white"
                                        : "border-border bg-card"
                                    }`}
                                  >
                                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                  </div>
                                  <span className="truncate text-[11px]">{perm.action}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            />
          </div>

          {/* 📌 Executive Actions Footer */}
          <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl border-border/80 px-5 font-semibold hover:bg-muted"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-bold text-xs sm:text-sm px-6 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <CheckCircle2 className="h-4 w-4 me-2" />}
              <span>{isEdit ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "إنشاء الدور" : "Create Role")}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

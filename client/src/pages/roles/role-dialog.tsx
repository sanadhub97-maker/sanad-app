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
      <DialogContent className="overflow-hidden rounded-3xl border border-border/80 bg-background/95 backdrop-blur-xl p-0 shadow-2xl w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col">
        {/* 🌟 Ambient Indigo Tone Light Bleed */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-44 w-96 rounded-full bg-gradient-to-b from-indigo-500/20 via-blue-500/10 to-transparent blur-3xl" />
        {/* 🌟 Top Specular Glass Sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

        {/* 💎 Executive Header */}
        <div className="relative z-10 px-6 pt-6 pb-4 border-b border-border/50 bg-muted/15 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <AppleIcon icon={ShieldCheck} tone="indigo" size="md" className="shadow-sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-black tracking-tight text-foreground font-sans">
                  {isEdit ? (isAr ? "تعديل الدور والصلاحيات" : "Edit Role & Permissions") : (isAr ? "إضافة دور إداري جديد" : "Add New Role")}
                </DialogTitle>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                  </span>
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
        <form id="role-dialog-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 pb-12">
          {/* Section 1: Role Information */}
          <div className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-1 text-xs font-bold uppercase tracking-wider text-foreground">
              <Shield className="h-4 w-4 text-indigo-500" />
              <span>{isAr ? "تعريف الدور الإداري" : "Role Definition"}</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={isAr ? "مسمى الدور" : "Role Name"} required error={errors.name ? (isAr ? "مطلوب" : "Required") : undefined} icon={Shield}>
                <Input
                  {...register("name", { required: true })}
                  disabled={role?.isSystem}
                  placeholder={isAr ? "مثال: مدير الموارد البشرية" : "e.g. HR Manager"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/60"
                />
              </FormField>

              <FormField label={isAr ? "الوصف الإداري" : "Description"} icon={FileText}>
                <Input
                  {...register("description")}
                  placeholder={isAr ? "وصف مختصر للمهام المنوطة بهذا الدور" : "Brief description of role responsibilities"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/60"
                />
              </FormField>
            </div>
          </div>

          {/* Section 2: Granular Permissions Matrix */}
          <div className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <KeyRound className="h-4 w-4 text-indigo-500" />
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
                <div className="space-y-3 max-h-80 overflow-y-auto pe-1">
                  {loadingCatalogue ? (
                    <div className="flex items-center justify-center p-6 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin me-2 text-indigo-500" />
                      <span>{isAr ? "جاري تحميل جدول الصلاحيات..." : "Loading permissions catalogue..."}</span>
                    </div>
                  ) : (
                    (catalogue ?? []).map((group) => {
                      const selected = new Set(field.value);
                      const allChecked = group.permissions.every((p) => selected.has(p.key));

                      return (
                        <div key={group.module} className="rounded-xl border border-border/70 bg-card/90 p-3.5 shadow-2xs transition-all">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
                            <div className="flex items-center gap-2">
                              <Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span className="text-xs font-bold text-foreground">
                                {t(`moduleNames.${group.module}`, { defaultValue: group.module.replace(/([A-Z])/g, " $1") })}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                ({group.permissions.filter((p) => selected.has(p.key)).length}/{group.permissions.length})
                              </span>
                            </div>
                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer select-none">
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

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
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
                                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-semibold ring-1 ring-indigo-500/10"
                                      : "bg-background/80 border-border/60 hover:bg-background hover:border-border text-foreground"
                                  }`}
                                >
                                  <div
                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-all ${
                                      isChecked
                                        ? "bg-indigo-600 border-indigo-600 text-white"
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
        </form>

        {/* 📌 Executive Actions Footer */}
        <div className="shrink-0 px-6 sm:px-8 py-3.5 border-t border-border/80 bg-muted/20 backdrop-blur-md flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-xl border-border/80 px-6 font-semibold hover:bg-muted"
          >
            {t("common.cancel")}
          </Button>
          <Button
            form="role-dialog-form"
            type="submit"
            disabled={isSubmitting}
            className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-800 text-white font-bold text-xs sm:text-sm px-8 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <CheckCircle2 className="h-4 w-4 me-2" />}
            <span>{isEdit ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "إنشاء الدور" : "Create Role")}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

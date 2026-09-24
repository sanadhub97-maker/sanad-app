import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Loader2,
  UserPlus,
  UserCheck,
  CheckCircle2,
  Shield,
  User,
  Mail,
  Lock,
  Phone,
  Check,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AppleIcon } from "@/components/common/apple-icon";
import { FormField } from "@/components/common/form-field";
import { usersApi } from "@/api/users";
import { rolesApi } from "@/api/roles";
import { getErrorMessage } from "@/lib/api";
import { tr } from "@/i18n";
import { translateRoleName } from "@/lib/role-display";
import type { AppUser } from "@/types/models";

const makeCreateSchema = () =>
  z.object({
    fullName: z.string().min(2, tr("الاسم مطلوب", "Name is required")),
    email: z.string().email(tr("صيغة البريد الإلكتروني غير صحيحة", "Invalid email address")),
    phone: z.string().optional(),
    password: z.string().min(8, tr("كلمة المرور يجب أن لا تقل عن 8 أحرف", "Password must be at least 8 characters")),
    roleIds: z.array(z.string()).min(1, tr("يرجى تحديد دور وظيفي واحد على الأقل", "Select at least one role")),
  });
const makeUpdateSchema = () =>
  z.object({
    fullName: z.string().min(2, tr("الاسم مطلوب", "Name is required")),
    phone: z.string().optional(),
    isActive: z.boolean(),
    roleIds: z.array(z.string()).min(1, tr("يرجى تحديد دور وظيفي واحد على الأقل", "Select at least one role")),
  });

export function UserDialog({
  open,
  user,
  onOpenChange,
}: {
  open: boolean;
  user?: AppUser;
  onOpenChange: (o: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();
  const isEdit = Boolean(user);
  const { data: roles, isLoading: loadingRoles } = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<ReturnType<typeof makeCreateSchema>> & Partial<z.infer<ReturnType<typeof makeUpdateSchema>>>>({
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt on a language switch so messages follow it
    resolver: zodResolver(useMemo(isEdit ? makeUpdateSchema : makeCreateSchema, [isEdit, isAr])) as never,
    defaultValues: { roleIds: [], isActive: true },
  });

  useEffect(() => {
    if (open) {
      reset(
        user
          ? { fullName: user.fullName, phone: user.phone ?? "", isActive: user.isActive, roleIds: user.roles.map((r) => r.id) }
          : { roleIds: [], isActive: true }
      );
    }
  }, [open, user, reset]);

  const mutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => (isEdit ? usersApi.update(user!.id, values) : usersApi.create(values as never)),
    onSuccess: (res) => {
      toast.success(res.message ?? (isAr ? "تم حفظ بيانات المستخدم بنجاح" : "User saved successfully"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-3xl border border-border/80 bg-background/95 backdrop-blur-xl p-0 shadow-2xl w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[92vh] flex flex-col">
        {/* 🌟 Ambient Purple Tone Light Bleed */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-44 w-96 rounded-full bg-gradient-to-b from-purple-500/20 via-violet-500/10 to-transparent blur-3xl" />
        {/* 🌟 Top Specular Glass Sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />

        {/* 💎 Executive Header */}
        <div className="relative z-10 px-6 pt-6 pb-4 border-b border-border/50 bg-muted/15 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <AppleIcon icon={isEdit ? UserCheck : UserPlus} tone="purple" size="md" className="shadow-sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-black tracking-tight text-foreground font-sans">
                  {isEdit ? (isAr ? "تعديل حساب المستخدم" : "Edit User Account") : (isAr ? "إضافة مستخدم جديد" : "Add New User")}
                </DialogTitle>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 px-2.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                  </span>
                  {isEdit ? (isAr ? "تعديل سجل" : "Edit") : (isAr ? "مستخدم جديد" : "New User")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAr ? "إدارة بيانات الاعتماد وتخصيص الأدوار والصلاحيات الإدارية" : "Manage credentials and allocate organizational security roles"}
              </p>
            </div>
          </div>
        </div>

        {/* 📋 Form Body */}
        <form id="user-dialog-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 pb-12">
          {/* Section 1: Account Credentials */}
          <div className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-1 text-xs font-bold uppercase tracking-wider text-foreground">
              <User className="h-4 w-4 text-purple-500" />
              <span>{isAr ? "بيانات الدخول والحساب" : "Account Credentials"}</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={isAr ? "الاسم الكامل" : "Full Name"} required error={errors.fullName?.message} icon={User}>
                <Input
                  {...register("fullName")}
                  placeholder={isAr ? "مثال: عبد العزيز محمد الشمري" : "e.g. Abdulaziz Alshammari"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-purple-500/30 focus-visible:border-purple-500/60"
                />
              </FormField>

              <FormField label={isAr ? "رقم الجوال" : "Mobile Phone"} icon={Phone}>
                <Input
                  {...register("phone")}
                  dir="ltr"
                  placeholder="+966 50 000 0000"
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-purple-500/30 focus-visible:border-purple-500/60"
                />
              </FormField>

              {!isEdit ? (
                <>
                  <FormField label={isAr ? "البريد الإلكتروني الرسمي" : "Work Email"} required error={String(errors.email?.message ?? "")} icon={Mail}>
                    <Input
                      type="email"
                      dir="ltr"
                      {...register("email")}
                      placeholder="user@company.com"
                      className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-purple-500/30 focus-visible:border-purple-500/60"
                    />
                  </FormField>

                  <FormField label={isAr ? "كلمة المرور" : "Password"} required hint={isAr ? "8+ أحرف" : "8+ chars"} error={String(errors.password?.message ?? "")} icon={Lock}>
                    <Input
                      type="password"
                      dir="ltr"
                      {...register("password")}
                      placeholder="••••••••"
                      className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-purple-500/30 focus-visible:border-purple-500/60"
                    />
                  </FormField>
                </>
              ) : (
                <FormField label={isAr ? "حالة الحساب" : "Account Status"} className="sm:col-span-2">
                  <Controller
                    control={control}
                    name="isActive"
                    render={({ field }) => (
                      <label className="flex items-center gap-3 h-11 px-4 rounded-xl border border-border/80 bg-background/90 cursor-pointer select-none transition-colors hover:bg-background shadow-xs">
                        <Checkbox
                          checked={Boolean(field.value)}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                        />
                        <span className="text-xs font-bold text-foreground">
                          {field.value ? (isAr ? "حساب نشط ومفعل" : "Active Account") : (isAr ? "حساب معطل" : "Inactive Account")}
                        </span>
                      </label>
                    )}
                  />
                </FormField>
              )}
            </div>
          </div>

          {/* Section 2: Roles Matrix */}
          <div className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <Shield className="h-4 w-4 text-purple-500" />
                <span>{isAr ? "الأدوار والصلاحيات الوظيفية" : "Assigned System Roles"}</span>
              </div>
              <span className="text-[11px] font-semibold text-rose-500 dark:text-rose-400">
                {isAr ? "* حدد دوراً واحداً على الأقل" : "* Required at least one"}
              </span>
            </div>

            <Controller
              control={control}
              name="roleIds"
              render={({ field }) => (
                <div className="space-y-2">
                  {loadingRoles ? (
                    <div className="flex items-center justify-center p-6 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin me-2 text-purple-500" />
                      <span>{isAr ? "جاري تحميل الأدوار..." : "Loading roles..."}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-56 overflow-y-auto pe-1">
                      {(roles ?? []).map((role) => {
                        const isChecked = (field.value as string[] | undefined)?.includes(role.id);
                        return (
                          <div
                            key={role.id}
                            onClick={() => {
                              const current = new Set(field.value as string[] || []);
                              isChecked ? current.delete(role.id) : current.add(role.id);
                              field.onChange(Array.from(current));
                            }}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                              isChecked
                                ? "bg-gradient-to-r from-purple-500/15 via-violet-500/10 to-purple-500/5 border-purple-500/40 text-foreground shadow-xs ring-1 ring-purple-500/20"
                                : "bg-background/80 border-border/70 hover:bg-background hover:border-purple-500/30 text-foreground shadow-xs"
                            }`}
                          >
                            <div
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                                isChecked
                                  ? "bg-purple-600 border-purple-600 text-white shadow-xs"
                                  : "border-border bg-card"
                              }`}
                            >
                              {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate">{translateRoleName(role.name, t)}</p>
                              {role.description && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {role.isSystem ? t("roles.systemRoleDescription") : role.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {errors.roleIds && (
                    <p className="text-[11px] font-semibold text-rose-500 mt-1">
                      {String(errors.roleIds.message)}
                    </p>
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
            form="user-dialog-form"
            type="submit"
            disabled={isSubmitting}
            className="h-11 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white font-bold text-xs sm:text-sm px-8 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <CheckCircle2 className="h-4 w-4 me-2" />}
            <span>{isEdit ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "إنشاء المستخدم" : "Create User")}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

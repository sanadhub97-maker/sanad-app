import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Loader2,
  Building2,
  CheckCircle2,
  Hash,
  Activity,
  MapPin,
  Phone,
  Mail,
  FileText,
  Navigation,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppleIcon } from "@/components/common/apple-icon";
import { FormField } from "@/components/common/form-field";
import { branchesApi } from "@/api/branches";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Branch } from "@/types/models";

const schema = z.object({
  name: z.string().min(2, "اسم المؤسسة مطلوب"),
  code: z.string().min(1, "رمز المؤسسة مطلوب"),
  city: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function BranchDialog({
  open,
  branch,
  onOpenChange,
}: {
  open: boolean;
  branch?: Branch;
  onOpenChange: (o: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();
  const isEdit = Boolean(branch);

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: "ACTIVE" },
  });

  useEffect(() => {
    if (open) {
      reset(
        branch
          ? {
              ...branch,
              email: branch.email ?? "",
              city: branch.city ?? "",
              address: branch.address ?? "",
              phone: branch.phone ?? "",
              notes: branch.notes ?? "",
            }
          : { status: "ACTIVE" }
      );
    }
  }, [open, branch, reset]);

  // Auto-fetch the next establishment code when creating a new one
  const {
    data: autoCode,
    isLoading: loadingAutoCode,
    refetch: refetchAutoCode,
  } = useQuery({
    queryKey: ["branches", "next-code"],
    queryFn: branchesApi.getNextCode,
    enabled: open && !isEdit,
  });

  useEffect(() => {
    if (open && !isEdit && autoCode) {
      const current = getValues("code");
      if (!current) {
        setValue("code", autoCode, { shouldValidate: true });
      }
    }
  }, [open, isEdit, autoCode, setValue, getValues]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => (isEdit ? branchesApi.update(branch!.id, values) : branchesApi.create(values)),
    onSuccess: (res) => {
      toast.success(res.message ?? (isAr ? "تم حفظ بيانات المؤسسة بنجاح" : "Establishment saved successfully"));
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-3xl border border-border/80 bg-card p-0 shadow-2xl sm:max-w-xl max-h-[90vh] flex flex-col">
        {/* 🌟 Ambient Emerald Tone Light Bleed */}
        <div className="pointer-events-none absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-transparent" />
        {/* 🌟 Top Specular Glass Sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent" />

        {/* 💎 Executive Header */}
        <div className="relative z-10 px-6 pt-6 pb-4 border-b border-border/50 bg-card/60 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <AppleIcon icon={Building2} tone="emerald" size="md" className="shadow-sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-black tracking-tight text-foreground font-sans">
                  {isEdit ? (isAr ? "تعديل بيانات المؤسسة" : "Edit Establishment") : (isAr ? "إضافة مؤسسة جديدة" : "Add New Establishment")}
                </DialogTitle>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isEdit ? (isAr ? "تعديل سجل" : "Edit") : (isAr ? "مؤسسة جديدة" : "New Establishment")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAr ? "توثيق بيانات المؤسسة الإدارية والموقع الجغرافي ومعلومات الاتصال" : "Configure administrative establishment details, location, and contacts"}
              </p>
            </div>
          </div>
        </div>

        {/* 📋 Form Body */}
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Section 1: Core Identity */}
          <div className="rounded-2xl border border-border/60 bg-muted/25 dark:bg-muted/15 p-4 space-y-3.5">
            <div className="flex items-center gap-2 pb-1 text-xs font-bold text-foreground/80">
              <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isAr ? "البيانات الأساسية للمؤسسة" : "Core Establishment Identification"}</span>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <FormField label={t("branches.fields.name")} required error={errors.name?.message} icon={Building2}>
                <Input
                  {...register("name")}
                  placeholder={isAr ? "مثال: مؤسسة الرياض الرئيسية" : "e.g. Riyadh Est."}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/70 focus:border-emerald-500/60 focus:ring-4 focus:ring-emerald-500/10"
                />
              </FormField>

              <FormField
                label={t("branches.fields.code")}
                required
                error={errors.code?.message}
                icon={Hash}
                hint={!isEdit ? (isAr ? "توليد تسلسلي" : "Auto sequence") : undefined}
              >
                <div className="relative flex items-center">
                  <Input
                    {...register("code")}
                    placeholder={loadingAutoCode ? (isAr ? "جاري توليد الرمز..." : "Generating...") : "BR-001"}
                    className={cn(
                      "h-11 rounded-xl font-mono font-bold bg-background/90 border-border/70 uppercase focus:border-emerald-500/60 focus:ring-4 focus:ring-emerald-500/10",
                      !isEdit && "pe-28"
                    )}
                  />
                  {!isEdit && (
                    <button
                      type="button"
                      disabled={loadingAutoCode}
                      onClick={async () => {
                        const res = await refetchAutoCode();
                        if (res.data) {
                          setValue("code", res.data, { shouldValidate: true, shouldDirty: true });
                          toast.success(isAr ? `تم توليد رمز المؤسسة: ${res.data}` : `Generated code: ${res.data}`);
                        }
                      }}
                      className="absolute end-1.5 flex items-center gap-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1.5 text-[11px] font-semibold transition-colors border border-emerald-500/20 shadow-xs"
                      title={isAr ? "توليد رمز تسلسلي جديد تلقائياً" : "Generate a new sequential code"}
                    >
                      {isAr ? "توليد" : "Generate"}
                    </button>
                  )}
                </div>
              </FormField>

              <FormField label={t("branches.fields.status")} required icon={Activity} className="sm:col-span-2">
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/90 border-border/70">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-luxury">
                        <SelectItem value="ACTIVE">{t("status.ACTIVE")}</SelectItem>
                        <SelectItem value="INACTIVE">{t("status.INACTIVE")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>
          </div>

          {/* Section 2: Location & Contacts */}
          <div className="rounded-2xl border border-border/60 bg-muted/25 dark:bg-muted/15 p-4 space-y-3.5">
            <div className="flex items-center gap-2 pb-1 text-xs font-bold text-foreground/80">
              <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isAr ? "العنوان الوطني وبيانات الاتصال" : "Location & Contact Information"}</span>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <FormField label={t("branches.fields.city")} icon={MapPin}>
                <Input
                  {...register("city")}
                  placeholder={isAr ? "الرياض، جدة، الدمام..." : "Riyadh, Jeddah..."}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/70"
                />
              </FormField>

              <FormField label={t("branches.fields.phone")} icon={Phone}>
                <Input
                  {...register("phone")}
                  dir="ltr"
                  placeholder="+966 11 000 0000"
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/70"
                />
              </FormField>

              <FormField label={t("branches.fields.email")} error={errors.email?.message} icon={Mail} className="sm:col-span-2">
                <Input
                  type="email"
                  dir="ltr"
                  {...register("email")}
                  placeholder="info@company.com"
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/70"
                />
              </FormField>

              <FormField label={t("branches.fields.address")} icon={Navigation} className="sm:col-span-2">
                <Input
                  {...register("address")}
                  placeholder={isAr ? "اسم الشارع، رقم المبنى، الرمز البريدي" : "Street name, building #, postal code"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/70"
                />
              </FormField>

              <FormField label={t("branches.fields.notes")} icon={FileText} className="sm:col-span-2">
                <Textarea
                  {...register("notes")}
                  placeholder={isAr ? "ملاحظات إدارية أو تعليمات تشغيلية خاصة بالمؤسسة..." : "Internal notes or operational instructions..."}
                  className="rounded-xl bg-background/90 border-border/70 resize-none min-h-[72px]"
                />
              </FormField>
            </div>
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
              className="h-11 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-bold text-xs sm:text-sm px-6 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <CheckCircle2 className="h-4 w-4 me-2" />}
              <span>{isEdit ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "إنشاء المؤسسة" : "Create Establishment")}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

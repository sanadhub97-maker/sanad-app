import { useEffect, useMemo } from "react";
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
import { tr } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Branch } from "@/types/models";

const makeSchema = () =>
  z.object({
    nameEn: z.string().optional(),
    name: z.string().min(2, tr("اسم المؤسسة مطلوب", "Establishment name is required")),
    code: z.string().min(1, tr("رمز المؤسسة مطلوب", "Establishment code is required")),
    city: z.string().optional(),
    cityEn: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email(tr("البريد الإلكتروني غير صحيح", "Invalid email address")).optional().or(z.literal("")),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    notes: z.string().optional(),
  });
type FormValues = z.infer<ReturnType<typeof makeSchema>>;

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
    resolver: zodResolver(useMemo(makeSchema, [isAr])),
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
              cityEn: branch.cityEn ?? "",
              nameEn: branch.nameEn ?? "",
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
      <DialogContent className="overflow-hidden rounded-3xl border border-emerald-500/30 dark:border-emerald-500/20 bg-card p-0 shadow-2xl w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[92vh] flex flex-col">
        {/* 🌟 Ambient Emerald Tone Light Bleed */}
        <div className="pointer-events-none absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-emerald-500/20 via-emerald-500/5 to-transparent" />
        {/* 🌟 Top Specular Glass Sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />

        {/* 💎 Executive Header */}
        <div className="relative z-10 px-6 sm:px-8 pt-6 pb-4 border-b border-border/50 bg-card/60 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <AppleIcon icon={Building2} tone="emerald" size="lg" className="shadow-md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <DialogTitle className="text-xl font-black tracking-tight text-foreground font-sans">
                  {isEdit ? (isAr ? "تعديل بيانات المؤسسة" : "Edit Establishment") : (isAr ? "إضافة مؤسسة جديدة" : "Add New Establishment")}
                </DialogTitle>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isEdit ? (isAr ? "تعديل سجل" : "Edit") : (isAr ? "مؤسسة جديدة" : "New Establishment")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? "توثيق بيانات المؤسسة الإدارية والموقع الجغرافي ومعلومات الاتصال" : "Configure administrative establishment details, location, and contacts"}
              </p>
            </div>
          </div>
        </div>

        {/* 📋 Form Body */}
        <form id="branch-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 pb-12">
          {/* Section 1: Core Identity */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.04] p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/10">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? "البيانات الأساسية للمؤسسة" : "Core Establishment Identification"}
                </span>
              </div>
              <span className="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-400/80">
                {isAr ? "الهوية الإدارية والحالة التشغيلية" : "Identity & operational status"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-12">
              <FormField label={t("branches.fields.name")} required error={errors.name?.message} icon={Building2} className="sm:col-span-6">
                <Input
                  {...register("name")}
                  placeholder={isAr ? "مثال: مؤسسة الرياض الرئيسية" : "e.g. Riyadh Est."}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/70 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
                />
              </FormField>

              <FormField label={t("branches.fields.nameEn")} icon={Building2} className="sm:col-span-6">
                <Input
                  {...register("nameEn")}
                  dir="ltr"
                  placeholder="e.g. Riyadh Main Establishment"
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/70 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
                />
              </FormField>

              <FormField
                label={t("branches.fields.code")}
                required
                error={errors.code?.message}
                icon={Hash}
                hint={!isEdit ? (isAr ? "توليد تسلسلي" : "Auto sequence") : undefined}
                className="sm:col-span-6"
              >
                <div className="relative flex items-center">
                  <Input
                    {...register("code")}
                    placeholder={loadingAutoCode ? (isAr ? "جاري التوليد..." : "Generating...") : "BR-001"}
                    className={cn(
                      "h-11 rounded-xl font-mono font-bold bg-background/90 border-border/70 uppercase focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15",
                      !isEdit && "pe-20"
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
                      className="absolute end-1.5 flex items-center gap-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 px-2 py-1 text-[10px] font-bold transition-colors border border-emerald-500/25 shadow-xs"
                      title={isAr ? "توليد رمز تسلسلي جديد تلقائياً" : "Generate a new sequential code"}
                    >
                      {isAr ? "توليد" : "Generate"}
                    </button>
                  )}
                </div>
              </FormField>

              <FormField label={t("branches.fields.status")} required icon={Activity} className="sm:col-span-6">
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/90 border-border/70 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15">
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
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.04] p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/10">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? "العنوان الوطني وبيانات الاتصال" : "Location & Contact Information"}
                </span>
              </div>
              <span className="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-400/80">
                {isAr ? "معلومات التواصل والموقع الجغرافي" : "Contact channels and address"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-12">
              <FormField label={t("branches.fields.city")} icon={MapPin} className="sm:col-span-3">
                <Input
                  {...register("city")}
                  placeholder={isAr ? "الرياض، جدة، الدمام..." : "Riyadh, Jeddah..."}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/70 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
                />
              </FormField>

              <FormField label={t("branches.fields.cityEn")} icon={MapPin} className="sm:col-span-3">
                <Input
                  {...register("cityEn")}
                  dir="ltr"
                  placeholder="e.g. Riyadh"
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/70 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
                />
              </FormField>

              <FormField label={t("branches.fields.phone")} icon={Phone} className="sm:col-span-3">
                <Input
                  {...register("phone")}
                  dir="ltr"
                  placeholder="+966 11 000 0000"
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/70 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
                />
              </FormField>

              <FormField label={t("branches.fields.email")} error={errors.email?.message} icon={Mail} className="sm:col-span-3">
                <Input
                  type="email"
                  dir="ltr"
                  {...register("email")}
                  placeholder="info@company.com"
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/70 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
                />
              </FormField>

              <FormField label={t("branches.fields.address")} icon={Navigation} className="sm:col-span-12">
                <Input
                  {...register("address")}
                  placeholder={isAr ? "اسم الشارع، رقم المبنى، الرمز البريدي" : "Street name, building #, postal code"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/70 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
                />
              </FormField>

              <FormField label={t("branches.fields.notes")} icon={FileText} className="sm:col-span-12">
                <Textarea
                  {...register("notes")}
                  placeholder={isAr ? "ملاحظات إدارية أو تعليمات تشغيلية خاصة بالمؤسسة..." : "Internal notes or operational instructions..."}
                  className="rounded-xl bg-background/90 border-border/70 resize-none min-h-[72px] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
                />
              </FormField>
            </div>
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
            form="branch-form"
            type="submit"
            disabled={isSubmitting}
            className="h-11 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-bold text-xs sm:text-sm px-8 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <CheckCircle2 className="h-4 w-4 me-2" />}
            <span>{isEdit ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "إنشاء المؤسسة" : "Create Establishment")}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

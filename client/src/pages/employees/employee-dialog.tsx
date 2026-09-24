import { useEffect, useMemo, useState } from "react";
import { useAutoTranslate } from "@/hooks/use-auto-translate";
import { EnglishInput } from "@/components/common/english-input";
import { localized } from "@/lib/names";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Users,
  Phone,
  Briefcase,
  Sparkles,
  CheckCircle2,
  Loader2,
  Hash,
  User,
  Languages,
  Globe,
  UserCheck,
  Calendar,
  Mail,
  MapPin,
  Building2,
  FolderKanban,
  Building,
  CalendarCheck,
  Activity,
  FileEdit,
} from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppleIcon } from "@/components/common/apple-icon";
import { FormField } from "@/components/common/form-field";
import { DateInput } from "@/components/common/date-input";
import { employeesApi } from "@/api/employees";
import { listActiveBranches } from "@/api/branches";
import { getErrorMessage } from "@/lib/api";
import { tr } from "@/i18n";
import { toDateInputValue, nullsToUndefined } from "@/lib/utils";
import { transliterateArabicName } from "@/lib/arabic-transliteration";
import type { Employee } from "@/types/models";

const makeSchema = () => z.object({
  employeeNumber: z.string().min(1, tr("رقم الموظف مطلوب", "Employee number is required")),
  fullNameAr: z.string().min(2, tr("الاسم الكامل بالعربي مطلوب", "Full Arabic name is required")),
  fullNameEn: z.string().optional(),
  nationality: z.string().optional(),
  nationalityEn: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  dateOfBirth: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email(tr("صيغة البريد الإلكتروني غير صحيحة", "Invalid email address")).optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  cityEn: z.string().optional(),
  jobTitle: z.string().optional(),
  jobTitleEn: z.string().optional(),
  department: z.string().optional(),
  departmentEn: z.string().optional(),
  branchId: z.string().optional(),
  joiningDate: z.string().optional(),
  employmentStatus: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"]),
  notes: z.string().optional(),
  iqamaNumber: z.string().optional(),
  iqamaIssueDate: z.string().optional(),
  iqamaExpiryDate: z.string().optional(),
  iqamaFileId: z.string().optional(),
  passportNumber: z.string().optional(),
  passportCountry: z.string().optional(),
  passportIssueDate: z.string().optional(),
  passportExpiryDate: z.string().optional(),
  passportFileId: z.string().optional(),
});

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

const DEFAULTS: FormValues = {
  employeeNumber: "",
  fullNameAr: "",
  employmentStatus: "ACTIVE",
};

interface EmployeeDialogProps {
  open: boolean;
  employee?: Employee;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (employee: Employee) => void;
}

export function EmployeeDialog({ open, employee, onOpenChange, onSuccess }: EmployeeDialogProps) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const isEdit = Boolean(employee);
  const queryClient = useQueryClient();

  const { data: branches } = useQuery({ queryKey: ["branches", "active"], queryFn: listActiveBranches });
  const [manuallyEditedEn, setManuallyEditedEn] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(useMemo(makeSchema, [isAr])),
    defaultValues: DEFAULTS,
  });
  const auto = useAutoTranslate<FormValues>({ getValues, setValue }, [{ ar: "nationality", en: "nationalityEn", kind: "nationality" }, { ar: "city", en: "cityEn" }, { ar: "jobTitle", en: "jobTitleEn" }, { ar: "department", en: "departmentEn" }], open);

  // Auto-fetch next employee number if creating
  const {
    data: autoNumber,
    isLoading: loadingAutoNumber,
    refetch: refetchAutoNumber,
  } = useQuery({
    queryKey: ["employees", "next-number"],
    queryFn: employeesApi.getNextNumber,
    enabled: open && !isEdit,
  });

  useEffect(() => {
    if (open) {
      if (employee) {
        reset(
          nullsToUndefined({
            ...DEFAULTS,
            ...employee,
            email: employee.email ?? "",
            dateOfBirth: toDateInputValue(employee.dateOfBirth),
            joiningDate: toDateInputValue(employee.joiningDate),
            iqamaIssueDate: toDateInputValue(employee.iqamaIssueDate),
            iqamaExpiryDate: toDateInputValue(employee.iqamaExpiryDate),
            passportIssueDate: toDateInputValue(employee.passportIssueDate),
            passportExpiryDate: toDateInputValue(employee.passportExpiryDate),
            branchId: employee.branchId ?? undefined,
            gender: employee.gender ?? undefined,
          }) as FormValues
        );
        if (employee.fullNameEn) {
          setManuallyEditedEn(true);
        }
      } else {
        reset(DEFAULTS);
        setManuallyEditedEn(false);
      }
    }
  }, [open, employee, reset]);

  useEffect(() => {
    if (open && !isEdit && autoNumber) {
      const current = getValues("employeeNumber");
      if (!current) {
        setValue("employeeNumber", autoNumber, { shouldValidate: true });
      }
    }
  }, [open, isEdit, autoNumber, setValue, getValues]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit ? employeesApi.update(employee!.id, values) : employeesApi.create(values),
    onSuccess: (res) => {
      toast.success(res.message ?? t("common.savedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      if (employee?.id) {
        queryClient.invalidateQueries({ queryKey: ["employees", employee.id] });
      }
      onOpenChange(false);
      onSuccess?.(res.data);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-3xl border border-border/80 bg-background/95 backdrop-blur-2xl p-0 shadow-2xl w-full sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[92vh] flex flex-col">
        {/* 🌟 Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-44 w-96 rounded-full bg-gradient-to-b from-blue-500/20 via-indigo-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* 🌟 Specular Glass Edge */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

        {/* 👑 Executive Dialog Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/15 relative z-10 shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <AppleIcon icon={Users} tone="blue" size="lg" />
              <div>
                <div className="flex items-center gap-2.5">
                  <DialogTitle className="text-xl font-black tracking-tight text-foreground font-sans">
                    {isEdit ? (isAr ? "تعديل بيانات الموظف" : "Edit Employee") : (isAr ? "إضافة موظف جديد" : "New Employee")}
                  </DialogTitle>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/25 shadow-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                    </span>
                    {isEdit ? (isAr ? "تعديل ملف" : "Edit") : (isAr ? "موظف جديد" : "New")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr
                    ? "إدخال وتوثيق ملف الموظف، الهوية، وبيانات العمل والارتباط الإداري"
                    : "Register employee profile, personal details, and branch placement"}
                </p>
              </div>
            </div>
          </div>

          {/* 🔘 Quick Section Jump Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => scrollToSection("emp-sec-identity")}
              className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all font-bold whitespace-nowrap text-xs border border-blue-500/25 shadow-xs flex items-center gap-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span>{isAr ? "1. الهوية والأساسيات" : "1. Identity"}</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("emp-sec-contact")}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all font-bold whitespace-nowrap text-xs border border-emerald-500/25 shadow-xs flex items-center gap-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{isAr ? "2. التواصل والإقامة" : "2. Contact & Residency"}</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("emp-sec-job")}
              className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-all font-bold whitespace-nowrap text-xs border border-purple-500/25 shadow-xs flex items-center gap-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              <span>{isAr ? "3. العمل والمؤسسة" : "3. Job & Establishment"}</span>
            </button>
          </div>
        </DialogHeader>

        {/* 📝 Scrollable Form Body */}
        <form id="employee-dialog-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 pb-12">
          {/* 👤 Section 1: Personal & Identity Information */}
          <div id="emp-sec-identity" className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <AppleIcon icon={Users} tone="blue" size="sm" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? "الهوية والمعلومات الأساسية" : "Personal & Identity Information"}
                </h3>
              </div>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                01 / 03
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                label={t("employees.fields.employeeNumber")}
                icon={Hash}
                required
                error={errors.employeeNumber?.message}
                hint={!isEdit ? (isAr ? "توليد تسلسلي" : "Auto sequence") : undefined}
              >
                <div className="flex gap-2 items-center">
                  <Input
                    {...register("employeeNumber")}
                    placeholder={loadingAutoNumber ? (isAr ? "جاري توليد الرقم..." : "Generating...") : "EMP-0001"}
                    className="h-11 rounded-xl font-mono font-bold text-sm bg-background/90 border-border/80 shadow-xs focus-visible:ring-blue-500/30 focus-visible:border-blue-500/60 flex-1"
                  />
                  {!isEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loadingAutoNumber}
                      onClick={async () => {
                        const res = await refetchAutoNumber();
                        if (res.data) {
                          setValue("employeeNumber", res.data, { shouldValidate: true, shouldDirty: true });
                          toast.success(isAr ? `تم توليد رقم الموظف: ${res.data}` : `Employee number generated: ${res.data}`);
                        }
                      }}
                      className="h-11 px-3.5 rounded-xl border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs shrink-0 flex items-center gap-1.5 shadow-xs transition-colors"
                      title={isAr ? "توليد رقم وظيفي تسلسلي جديد تلقائياً" : "Generate the next employee number"}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{loadingAutoNumber ? "..." : isAr ? "توليد تلقائي" : "Auto"}</span>
                    </Button>
                  )}
                </div>
              </FormField>

              <FormField
                label={t("employees.fields.fullNameAr")}
                icon={User}
                required
                hint={isAr ? "يترجم فورياً" : "Live auto-sync"}
                error={errors.fullNameAr?.message}
              >
                <Input
                  {...register("fullNameAr", {
                    onChange: (e) => {
                      const arVal = e.target.value;
                      if (!manuallyEditedEn) {
                        const transliterated = transliterateArabicName(arVal);
                        setValue("fullNameEn", transliterated, { shouldValidate: false, shouldDirty: true });
                      }
                    },
                  })}
                  dir="rtl"
                  placeholder="مثال: محمد عبدالله سالم الغامدي"
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-blue-500/30 focus-visible:border-blue-500/60"
                />
              </FormField>

              <FormField
                label={t("employees.fields.fullNameEn")}
                icon={Languages}
                hint={isAr ? "التهجئة الرسمية" : "Official spelling"}
              >
                <div className="flex gap-2 items-center">
                  <Input
                    {...register("fullNameEn", {
                      onChange: () => setManuallyEditedEn(true),
                    })}
                    placeholder={isAr ? "مثال: Mohammed Abdullah Salem Alghamdi" : "e.g. Mohammed Abdullah Salem Alghamdi"}
                    dir="ltr"
                    className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-blue-500/30 focus-visible:border-blue-500/60 flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const ar = watch("fullNameAr");
                      if (!ar || !ar.trim()) {
                        toast.info(isAr ? "يرجى كتابة الاسم بالعربي أولاً" : "Please enter the Arabic name first");
                        return;
                      }
                      const translated = transliterateArabicName(ar);
                      setManuallyEditedEn(false);
                      setValue("fullNameEn", translated, { shouldValidate: true, shouldDirty: true });
                      toast.success(isAr ? `تمت ترجمة الاسم: ${translated}` : `Transliterated: ${translated}`);
                    }}
                    className="h-11 px-3.5 rounded-xl border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold text-xs shrink-0 flex items-center gap-1.5 shadow-xs transition-colors"
                    title={isAr ? "إعادة ترجمة وتعريب الاسم من العربي تلقائياً" : "Transliterate the name from Arabic"}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                    <span>{isAr ? "ترجمة ذكية" : "Translate"}</span>
                  </Button>
                </div>
              </FormField>

              <FormField label={t("employees.fields.nationality")} icon={Globe}>
                <Input
                  {...register("nationality", { onChange: auto.arChange("nationalityEn") })}
                  placeholder={isAr ? "مثال: سعودي، مصري، أردني..." : "e.g. Saudi"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-blue-500/30 focus-visible:border-blue-500/60"
                />
              </FormField>

              <FormField label={t("employees.fields.nationalityEn")} icon={Globe}>
                <EnglishInput
                  {...register("nationalityEn", { onChange: auto.enChange("nationalityEn") })}
                  onTranslate={() => auto.translateNow("nationalityEn")}
                  busy={auto.busy.nationalityEn}
                  placeholder="e.g. Egyptian"
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-blue-500/30 focus-visible:border-blue-500/60"
                />
              </FormField>

              <FormField label={t("employees.fields.gender")} icon={UserCheck}>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-blue-500/30 focus-visible:border-blue-500/60">
                        <SelectValue placeholder={t("common.all")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        <SelectItem value="MALE">{t("employees.fields.male")}</SelectItem>
                        <SelectItem value="FEMALE">{t("employees.fields.female")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField label={t("employees.fields.dateOfBirth")} icon={Calendar}>
                <Controller
                  control={control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <DateInput
                      value={field.value}
                      onChange={field.onChange}
                      className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-blue-500/30 focus-visible:border-blue-500/60 font-mono"
                    />
                  )}
                />
              </FormField>
            </div>
          </div>

          {/* 📞 Section 2: Contact & Address Information */}
          <div id="emp-sec-contact" className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <AppleIcon icon={Phone} tone="emerald" size="sm" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? "بيانات التواصل والعنوان الوطني" : "Contact & Residence Details"}
                </h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                02 / 03
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label={t("employees.fields.mobile")} icon={Phone}>
                <Input
                  {...register("mobile")}
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                  className="h-11 rounded-xl font-mono bg-background/90 border-border/80 shadow-xs focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/60"
                />
              </FormField>

              <FormField label={t("employees.fields.email")} icon={Mail} error={errors.email?.message}>
                <Input
                  type="email"
                  {...register("email")}
                  placeholder="employee@company.com"
                  dir="ltr"
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/60"
                />
              </FormField>

              <FormField label={t("employees.fields.city")} icon={MapPin}>
                <Input
                  {...register("city", { onChange: auto.arChange("cityEn") })}
                  placeholder={isAr ? "مثال: الرياض، جدة، الخبر..." : "e.g. Riyadh"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/60"
                />
              </FormField>

              <FormField label={t("employees.fields.cityEn")} icon={MapPin}>
                <EnglishInput
                  {...register("cityEn", { onChange: auto.enChange("cityEn") })}
                  onTranslate={() => auto.translateNow("cityEn")}
                  busy={auto.busy.cityEn}
                  placeholder="e.g. Bisha"
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/60"
                />
              </FormField>

              <FormField label={t("employees.fields.address")} icon={Building2} className="sm:col-span-2 lg:col-span-3">
                <Input
                  {...register("address")}
                  placeholder={isAr ? "اسم الحي، الشارع، رقم المبنى، الرمز البريدي" : "District, Street, Building, Postal Code"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/60"
                />
              </FormField>
            </div>
          </div>

          {/* 💼 Section 3: Job & Organizational Information */}
          <div id="emp-sec-job" className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <AppleIcon icon={Briefcase} tone="purple" size="sm" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? "البيانات الوظيفية والمؤسسة" : "Job & Establishment Assignment"}
                </h3>
              </div>
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                03 / 03
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label={t("employees.fields.jobTitle")} icon={Briefcase}>
                <Input
                  {...register("jobTitle", { onChange: auto.arChange("jobTitleEn") })}
                  placeholder={isAr ? "مثال: مدير عمليات، مهندس، محاسب..." : "e.g. Operations Manager"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-purple-500/30 focus-visible:border-purple-500/60"
                />
              </FormField>

              <FormField label={t("employees.fields.jobTitleEn")} icon={Briefcase}>
                <EnglishInput
                  {...register("jobTitleEn", { onChange: auto.enChange("jobTitleEn") })}
                  onTranslate={() => auto.translateNow("jobTitleEn")}
                  busy={auto.busy.jobTitleEn}
                  placeholder="e.g. Operations Manager"
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-purple-500/30 focus-visible:border-purple-500/60"
                />
              </FormField>

              <FormField label={t("employees.fields.department")} icon={FolderKanban}>
                <Input
                  {...register("department", { onChange: auto.arChange("departmentEn") })}
                  placeholder={isAr ? "مثال: الموارد البشرية، المالية، المبيعات..." : "e.g. Human Resources"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-purple-500/30 focus-visible:border-purple-500/60"
                />
              </FormField>

              <FormField label={t("employees.fields.departmentEn")} icon={FolderKanban}>
                <EnglishInput
                  {...register("departmentEn", { onChange: auto.enChange("departmentEn") })}
                  onTranslate={() => auto.translateNow("departmentEn")}
                  busy={auto.busy.departmentEn}
                  placeholder="e.g. Human Resources"
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-purple-500/30 focus-visible:border-purple-500/60"
                />
              </FormField>

              <FormField label={t("employees.fields.branchId")} icon={Building} required error={errors.branchId?.message}>
                <Controller
                  control={control}
                  name="branchId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus:ring-purple-500/30 focus:border-purple-500/60">
                        <SelectValue placeholder={isAr ? "اختر فرع العمل / المركز" : "Select Branch"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border shadow-xl">
                        {branches?.map((b) => (
                          <SelectItem key={b.id} value={b.id} className="rounded-lg font-medium cursor-pointer">
                            <bdi>{localized(b.name, b.nameEn)}</bdi>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField label={t("employees.fields.joiningDate")} icon={CalendarCheck}>
                <Controller
                  control={control}
                  name="joiningDate"
                  render={({ field }) => (
                    <DateInput
                      value={field.value}
                      onChange={field.onChange}
                      className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-purple-500/30 focus-visible:border-purple-500/60 font-mono"
                    />
                  )}
                />
              </FormField>

              <FormField label={t("employees.fields.employmentStatus")} icon={Activity}>
                <Controller
                  control={control}
                  name="employmentStatus"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl font-bold bg-background/90 border-border/80 shadow-xs focus:ring-purple-500/30 focus:border-purple-500/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border shadow-xl">
                        <SelectItem value="ACTIVE" className="rounded-lg font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer">
                          {isAr ? "نشط ومباشر للعمل" : "Active"}
                        </SelectItem>
                        <SelectItem value="INACTIVE" className="rounded-lg font-medium text-muted-foreground cursor-pointer">
                          {isAr ? "غير نشط / موقوف" : "Inactive"}
                        </SelectItem>
                        <SelectItem value="ON_LEAVE" className="rounded-lg font-medium text-amber-600 dark:text-amber-400 cursor-pointer">
                          {isAr ? "في إجازة رسمية" : "On Leave"}
                        </SelectItem>
                        <SelectItem value="TERMINATED" className="rounded-lg font-medium text-destructive cursor-pointer">
                          {isAr ? "منتهي الخدمة / عقد ملغى" : "Terminated"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField label={t("employees.fields.notes")} icon={FileEdit} className="sm:col-span-2 lg:col-span-3">
                <Textarea
                  {...register("notes")}
                  placeholder={isAr ? "أي ملاحظات إدارية، سجل سابق، أو تعليمات خاصة..." : "Internal notes or instructions..."}
                  className="rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-purple-500/30 focus-visible:border-purple-500/60 min-h-[80px]"
                />
              </FormField>
            </div>
          </div>
        </form>

        {/* 🌟 Deluxe Action Buttons Footer */}
        <DialogFooter className="shrink-0 px-6 sm:px-8 py-3.5 border-t border-border/80 bg-muted/20 backdrop-blur-md flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-xl border-border/80 px-6 font-semibold hover:bg-muted"
          >
            {t("common.cancel")}
          </Button>
          <Button
            form="employee-dialog-form"
            type="submit"
            disabled={isSubmitting}
            className="h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold text-sm px-8 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <CheckCircle2 className="h-4 w-4 me-2" />}
            <span>{isEdit ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "حفظ ملف الموظف" : "Save Employee")}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


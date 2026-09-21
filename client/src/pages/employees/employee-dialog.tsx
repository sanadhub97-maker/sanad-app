import { useEffect, useState } from "react";
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
  ShieldCheck,
  FileText,
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
  CalendarClock,
  Plane,
  Paperclip,
} from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppleIcon } from "@/components/common/apple-icon";
import { FormField } from "@/components/common/form-field";
import { DateInput } from "@/components/common/date-input";
import { FileUpload } from "@/components/common/file-upload";
import { employeesApi } from "@/api/employees";
import { listActiveBranches } from "@/api/branches";
import { getErrorMessage } from "@/lib/api";
import { toDateInputValue, nullsToUndefined, cn } from "@/lib/utils";
import { transliterateArabicName } from "@/lib/arabic-transliteration";
import type { Employee } from "@/types/models";

const schema = z.object({
  employeeNumber: z.string().min(1, "رقم الموظف مطلوب"),
  fullNameAr: z.string().min(2, "الاسم الكامل بالعربي مطلوب"),
  fullNameEn: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  dateOfBirth: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email("صيغة البريد الإلكتروني غير صحيحة").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
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

type FormValues = z.infer<typeof schema>;

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
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });

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
      <DialogContent className="overflow-hidden rounded-3xl border border-border/80 bg-background/95 backdrop-blur-xl p-0 shadow-2xl sm:max-w-4xl max-h-[92vh] flex flex-col">
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
                    ? "إدخال وتوثيق ملف الموظف، الهوية الوطنية/الإقامة، جواز السفر، والارتباط الإداري"
                    : "Register employee profile, civil ID/Iqama, passport details, and branch placement"}
                </p>
              </div>
            </div>
          </div>

          {/* 🔘 Quick Section Jump Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => scrollToSection("emp-sec-identity")}
              className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all font-semibold whitespace-nowrap text-[11px] border border-blue-500/20"
            >
              {isAr ? "1. الهوية والأساسيات" : "1. Identity"}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("emp-sec-contact")}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all font-semibold whitespace-nowrap text-[11px] border border-emerald-500/20"
            >
              {isAr ? "2. التواصل والعنوان" : "2. Contact"}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("emp-sec-job")}
              className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-all font-semibold whitespace-nowrap text-[11px] border border-purple-500/20"
            >
              {isAr ? "3. العمل والمؤسسة" : "3. Job & Establishment"}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("emp-sec-iqama")}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all font-semibold whitespace-nowrap text-[11px] border border-amber-500/20"
            >
              {isAr ? "4. الإقامة" : "4. Iqama"}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("emp-sec-passport")}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition-all font-semibold whitespace-nowrap text-[11px] border border-cyan-500/20"
            >
              {isAr ? "5. جواز السفر" : "5. Passport"}
            </button>
          </div>
        </DialogHeader>

        {/* 📝 Scrollable Form Body */}
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex-1 overflow-y-auto p-6 space-y-6">
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
                01 / 05
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
                <div className="relative flex items-center">
                  <Input
                    {...register("employeeNumber")}
                    placeholder={loadingAutoNumber ? "جاري توليد الرقم..." : "EMP-0001"}
                    className={cn(
                      "h-11 rounded-xl font-mono font-bold text-sm bg-background/90 border-border/80 shadow-xs focus-visible:ring-blue-500/30 focus-visible:border-blue-500/60",
                      !isEdit && "pe-28"
                    )}
                  />
                  {!isEdit && (
                    <button
                      type="button"
                      disabled={loadingAutoNumber}
                      onClick={async () => {
                        const res = await refetchAutoNumber();
                        if (res.data) {
                          setValue("employeeNumber", res.data, { shouldValidate: true, shouldDirty: true });
                          toast.success(`تم توليد رقم الموظف: ${res.data}`);
                        }
                      }}
                      className="absolute end-1.5 flex items-center gap-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1.5 text-[11px] font-semibold transition-colors border border-emerald-500/20 shadow-xs"
                      title="توليد رقم وظيفي تسلسلي جديد تلقائياً"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>{loadingAutoNumber ? "..." : isAr ? "توليد تلقائي" : "Auto"}</span>
                    </button>
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
                <div className="relative flex items-center">
                  <Input
                    {...register("fullNameEn", {
                      onChange: () => setManuallyEditedEn(true),
                    })}
                    placeholder={isAr ? "مثال: Mohammed Abdullah Salem Alghamdi" : "e.g. Mohammed Abdullah Salem Alghamdi"}
                    dir="ltr"
                    className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-blue-500/30 focus-visible:border-blue-500/60 pe-28"
                  />
                  <button
                    type="button"
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
                    className="absolute end-1.5 flex items-center gap-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2.5 py-1.5 text-[11px] font-semibold transition-colors border border-blue-500/20 shadow-xs"
                    title="إعادة ترجمة وتعريب الاسم من العربي تلقائياً"
                  >
                    <Sparkles className="h-3 w-3 text-blue-500" />
                    <span>{isAr ? "ترجمة ذكية" : "Translate"}</span>
                  </button>
                </div>
              </FormField>

              <FormField label={t("employees.fields.nationality")} icon={Globe}>
                <Input
                  {...register("nationality")}
                  placeholder={isAr ? "مثال: سعودي، مصري، أردني..." : "e.g. Saudi"}
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
                02 / 05
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
                  {...register("city")}
                  placeholder={isAr ? "مثال: الرياض، جدة، الخبر..." : "e.g. Riyadh"}
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
                03 / 05
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label={t("employees.fields.jobTitle")} icon={Briefcase}>
                <Input
                  {...register("jobTitle")}
                  placeholder={isAr ? "مثال: مدير عمليات، مهندس، محاسب..." : "e.g. Operations Manager"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-purple-500/30 focus-visible:border-purple-500/60"
                />
              </FormField>

              <FormField label={t("employees.fields.department")} icon={FolderKanban}>
                <Input
                  {...register("department")}
                  placeholder={isAr ? "مثال: الموارد البشرية، المالية، المبيعات..." : "e.g. Human Resources"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-purple-500/30 focus-visible:border-purple-500/60"
                />
              </FormField>

              <FormField label={t("employees.fields.branch")} icon={Building}>
                <Controller
                  control={control}
                  name="branchId"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-purple-500/30 focus-visible:border-purple-500/60">
                        <SelectValue placeholder={t("employees.fields.selectBranch")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        {(branches ?? []).map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
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
                      <SelectTrigger className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-purple-500/30 focus-visible:border-purple-500/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        <SelectItem value="ACTIVE">{t("status.ACTIVE")}</SelectItem>
                        <SelectItem value="INACTIVE">{t("status.INACTIVE")}</SelectItem>
                        <SelectItem value="ON_LEAVE">{t("status.ON_LEAVE")}</SelectItem>
                        <SelectItem value="TERMINATED">{t("status.TERMINATED")}</SelectItem>
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

          {/* 🛡️ Section 4: Iqama Information */}
          <div id="emp-sec-iqama" className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <AppleIcon icon={ShieldCheck} tone="amber" size="sm" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? "بيانات الإقامة النظامية" : "Iqama & Residence Permit Details"}
                </h3>
              </div>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                04 / 05
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label={t("employees.fields.iqamaNumber")} icon={Hash}>
                <Input
                  {...register("iqamaNumber")}
                  placeholder="10 أرقام (2XXXXXXXXX)"
                  className="h-11 rounded-xl font-mono font-bold bg-background/90 border-border/80 shadow-xs focus-visible:ring-amber-500/30 focus-visible:border-amber-500/60"
                />
              </FormField>

              <FormField label={t("employees.fields.issueDate")} icon={Calendar}>
                <Controller
                  control={control}
                  name="iqamaIssueDate"
                  render={({ field }) => (
                    <DateInput
                      value={field.value}
                      onChange={field.onChange}
                      className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-amber-500/30 focus-visible:border-amber-500/60 font-mono"
                    />
                  )}
                />
              </FormField>

              <FormField label={t("employees.fields.expiryDate")} icon={CalendarClock} hint={isAr ? "للتنبيهات" : "Alerts"}>
                <Controller
                  control={control}
                  name="iqamaExpiryDate"
                  render={({ field }) => (
                    <DateInput
                      value={field.value}
                      onChange={field.onChange}
                      className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-amber-500/30 focus-visible:border-amber-500/60 font-mono"
                    />
                  )}
                />
              </FormField>

              <FormField label={t("employees.fields.iqamaFile")} icon={Paperclip} className="sm:col-span-2 lg:col-span-3">
                <div className="rounded-2xl border border-border/80 bg-background/60 p-2.5 shadow-inner">
                  <FileUpload
                    fileId={watch("iqamaFileId")}
                    module="employee-iqama"
                    onUploaded={(fid) => setValue("iqamaFileId", fid)}
                    onRemoved={() => setValue("iqamaFileId", undefined)}
                  />
                </div>
              </FormField>
            </div>
          </div>

          {/* ✈️ Section 5: Passport Information */}
          <div id="emp-sec-passport" className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <AppleIcon icon={FileText} tone="cyan" size="sm" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? "بيانات وثيقة وجواز السفر" : "Passport Information"}
                </h3>
              </div>
              <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                05 / 05
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label={t("employees.fields.passportNumber")} icon={Plane}>
                <Input
                  {...register("passportNumber")}
                  placeholder="A12345678"
                  className="h-11 rounded-xl font-mono font-bold uppercase bg-background/90 border-border/80 shadow-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/60"
                />
              </FormField>

              <FormField label={t("employees.fields.passportCountry")} icon={Globe}>
                <Input
                  {...register("passportCountry")}
                  placeholder={isAr ? "دولة الإصدار" : "Issuing Country"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/60"
                />
              </FormField>

              <FormField label={t("employees.fields.issueDate")} icon={Calendar}>
                <Controller
                  control={control}
                  name="passportIssueDate"
                  render={({ field }) => (
                    <DateInput
                      value={field.value}
                      onChange={field.onChange}
                      className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/60 font-mono"
                    />
                  )}
                />
              </FormField>

              <FormField label={t("employees.fields.expiryDate")} icon={CalendarClock} hint={isAr ? "للتنبيهات" : "Alerts"}>
                <Controller
                  control={control}
                  name="passportExpiryDate"
                  render={({ field }) => (
                    <DateInput
                      value={field.value}
                      onChange={field.onChange}
                      className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/60 font-mono"
                    />
                  )}
                />
              </FormField>

              <FormField label={t("employees.fields.passportFile")} icon={Paperclip} className="sm:col-span-2 lg:col-span-3">
                <div className="rounded-2xl border border-border/80 bg-background/60 p-2.5 shadow-inner">
                  <FileUpload
                    fileId={watch("passportFileId")}
                    module="employee-passport"
                    onUploaded={(fid) => setValue("passportFileId", fid)}
                    onRemoved={() => setValue("passportFileId", undefined)}
                  />
                </div>
              </FormField>
            </div>
          </div>

          {/* 🌟 Deluxe Action Buttons Footer */}
          <DialogFooter className="pt-2 gap-2 sm:gap-0 sticky bottom-0 bg-background/90 backdrop-blur-md pb-1">
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
              className="h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold text-sm px-6 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <CheckCircle2 className="h-4 w-4 me-2" />}
              <span>{isEdit ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "حفظ ملف الموظف" : "Save Employee")}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


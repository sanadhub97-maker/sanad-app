import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CreditCard,
  BookUser,
  HeartPulse,
  ShieldPlus,
  Stamp,
  Plane,
  User,
  Hash,
  Building,
  Loader2,
  CheckCircle2,
  Search,
} from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppleIcon } from "@/components/common/apple-icon";
import { FormField } from "@/components/common/form-field";
import { FileUpload } from "@/components/common/file-upload";
import { DateInput } from "@/components/common/date-input";
import { workforceDocumentsApi, type WorkforceDocumentItem } from "@/api/workforceDocuments";
import { employeesApi } from "@/api/employees";
import { getErrorMessage } from "@/lib/api";
import { toDateInputValue } from "@/lib/utils";

const schema = z.object({
  employeeId: z.string().min(1, "يجب تحديد الموظف"),
  documentNumber: z.string().min(1, "رقم الوثيقة مطلوب"),
  issuingAuthority: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  fileId: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docType?: "IQAMA" | "PASSPORT" | "HEALTH_CERTIFICATE" | "MEDICAL_INSURANCE" | "VISA" | "FLIGHT_TICKET";
  document?: WorkforceDocumentItem | null;
  queryKey: string;
  onSuccess?: () => void;
}

const TYPE_CONFIG = {
  IQAMA: {
    icon: CreditCard,
    tone: "blue" as const,
    titleKey: "workforce.iqamas.title",
    addKey: "workforce.iqamas.addTitle",
    numberKey: "workforce.iqamas.number",
    authorityKey: "المهنة / الملاحظة الرسمية",
  },
  PASSPORT: {
    icon: BookUser,
    tone: "purple" as const,
    titleKey: "workforce.passports.title",
    addKey: "workforce.passports.addTitle",
    numberKey: "workforce.passports.number",
    authorityKey: "workforce.passports.country",
  },
  HEALTH_CERTIFICATE: {
    icon: HeartPulse,
    tone: "emerald" as const,
    titleKey: "workforce.healthCertificates.title",
    addKey: "workforce.healthCertificates.addTitle",
    numberKey: "workforce.healthCertificates.number",
    authorityKey: "workforce.healthCertificates.authority",
  },
  MEDICAL_INSURANCE: {
    icon: ShieldPlus,
    tone: "cyan" as const,
    titleKey: "workforce.medicalInsurance.title",
    addKey: "workforce.medicalInsurance.addTitle",
    numberKey: "workforce.medicalInsurance.number",
    authorityKey: "workforce.medicalInsurance.authority",
  },
  VISA: {
    icon: Stamp,
    tone: "amber" as const,
    titleKey: "workforce.visas.title",
    addKey: "workforce.visas.addTitle",
    numberKey: "workforce.visas.number",
    authorityKey: "workforce.visas.authority",
  },
  FLIGHT_TICKET: {
    icon: Plane,
    tone: "rose" as const,
    titleKey: "workforce.flightTickets.title",
    addKey: "workforce.flightTickets.addTitle",
    numberKey: "workforce.flightTickets.number",
    authorityKey: "workforce.flightTickets.authority",
  },
};

export function WorkforceDocumentDialog({
  open,
  onOpenChange,
  docType,
  document,
  queryKey,
  onSuccess,
}: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();
  const isEdit = Boolean(document);

  const [selectedType, setSelectedType] = useState<keyof typeof TYPE_CONFIG>(
    docType && TYPE_CONFIG[docType] ? docType : "IQAMA"
  );

  useEffect(() => {
    if (document) {
      const detected = (document.type as keyof typeof TYPE_CONFIG) || (document.iqamaNumber ? "IQAMA" : "PASSPORT");
      if (TYPE_CONFIG[detected]) {
        setSelectedType(detected);
      }
    } else if (docType && TYPE_CONFIG[docType]) {
      setSelectedType(docType);
    }
  }, [document, docType, open]);

  const cfg = TYPE_CONFIG[selectedType] || TYPE_CONFIG.IQAMA;

  const [employeeSearch, setEmployeeSearch] = useState("");

  const { data: employeesData } = useQuery({
    queryKey: ["employees-selector"],
    queryFn: () => employeesApi.list({ pageSize: 200 }),
    enabled: open && !isEdit,
  });

  const employees = employeesData?.data ?? [];
  const filteredEmployees = employees.filter((emp) => {
    if (!employeeSearch.trim()) return true;
    const q = employeeSearch.toLowerCase();
    return (
      emp.fullNameAr.toLowerCase().includes(q) ||
      (emp.fullNameEn && emp.fullNameEn.toLowerCase().includes(q)) ||
      emp.employeeNumber.toLowerCase().includes(q)
    );
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId: "",
      documentNumber: "",
      issuingAuthority: "",
      issueDate: "",
      expiryDate: "",
      fileId: "",
      notes: "",
    },
  });

  const selectedEmployeeId = watch("employeeId");

  useEffect(() => {
    if (open) {
      if (document) {
        reset({
          employeeId: document.employeeId || document.id,
          documentNumber:
            document.documentNumber ||
            document.iqamaNumber ||
            document.passportNumber ||
            "",
          issuingAuthority:
            document.issuingAuthority || document.passportCountry || "",
          issueDate: toDateInputValue(document.issueDate),
          expiryDate: toDateInputValue(document.expiryDate),
          fileId: document.fileId ?? "",
          notes: document.notes ?? "",
        });
      } else {
        reset({
          employeeId: "",
          documentNumber: "",
          issuingAuthority: "",
          issueDate: "",
          expiryDate: "",
          fileId: "",
          notes: "",
        });
        setEmployeeSearch("");
      }
    }
  }, [open, document, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && document) {
        await workforceDocumentsApi.update(document.id, {
          documentNumber: values.documentNumber,
          issuingAuthority: values.issuingAuthority || undefined,
          issueDate: values.issueDate || undefined,
          expiryDate: values.expiryDate || undefined,
          fileId: values.fileId || undefined,
          notes: values.notes || undefined,
        });
        toast.success(isAr ? "تم تحديث السجل بنجاح" : "Record updated successfully");
      } else {
        await workforceDocumentsApi.create({
          employeeId: values.employeeId,
          type: selectedType,
          documentNumber: values.documentNumber,
          issuingAuthority: values.issuingAuthority || undefined,
          issueDate: values.issueDate || undefined,
          expiryDate: values.expiryDate || undefined,
          fileId: values.fileId || undefined,
          notes: values.notes || undefined,
        });
        toast.success(isAr ? "تمت إضافة السجل بنجاح" : "Record created successfully");
      }

      queryClient.invalidateQueries({ queryKey: [queryKey] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl rounded-3xl p-6">
        <DialogHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <AppleIcon icon={cfg.icon} tone={cfg.tone} size="md" />
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {isEdit
                  ? isAr
                    ? `تعديل ${t(cfg.titleKey)}`
                    : `Edit ${t(cfg.titleKey)}`
                  : t(cfg.addKey)}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAr
                  ? "أدخل بيانات الوثيقة وتاريخ الصلاحية والمرفقات بدقة"
                  : "Enter document details, expiration dates, and file attachments accurately"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* Document Type Selector (when adding new) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {isAr ? "نوع الوثيقة" : "Document Type"} <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {(Object.keys(TYPE_CONFIG) as (keyof typeof TYPE_CONFIG)[]).map((tKey) => {
                  const itemCfg = TYPE_CONFIG[tKey];
                  const isSelected = selectedType === tKey;
                  const ItemIcon = itemCfg.icon;
                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => setSelectedType(tKey)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                          : "border-border/60 bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ItemIcon className="h-4 w-4 mb-1" />
                      <span className="text-[11px] leading-tight truncate w-full">
                        {t(itemCfg.titleKey)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Employee Selection */}
          {isEdit && document ? (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
              <AppleIcon icon={User} tone="indigo" size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">
                    {document.fullNameAr || document.employee?.fullNameAr}
                  </span>
                  <span className="font-mono text-xs text-primary font-semibold px-2 py-0.5 rounded-full bg-primary/10">
                    {document.employeeNumber || document.employee?.employeeNumber}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {document.branch?.name || document.employee?.branch?.name || document.jobTitle || "—"}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                {t("workforce.dialog.selectEmployee")} <span className="text-destructive">*</span>
              </label>

              {/* Employee search box */}
              <div className="relative">
                <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("workforce.dialog.selectEmployeePlaceholder")}
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="ps-9 rounded-xl border-border/80 bg-muted/30 focus:bg-background transition-all"
                />
              </div>

              {/* Employee Selection Box */}
              <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-border/70 bg-card/40 p-1.5 scrollbar-thin">
                {filteredEmployees.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    {isAr ? "لا توجد نتائج مطابقة" : "No matching employees"}
                  </p>
                ) : (
                  filteredEmployees.slice(0, 15).map((emp) => {
                    const isSelected = selectedEmployeeId === emp.id;
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => setValue("employeeId", emp.id, { shouldValidate: true })}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-start transition-all text-xs ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                            : "hover:bg-muted/80 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate">{emp.fullNameAr}</span>
                          {emp.fullNameEn && (
                            <span className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              ({emp.fullNameEn})
                            </span>
                          )}
                        </div>
                        <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                          isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          {emp.employeeNumber}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              {errors.employeeId && (
                <p className="text-[11px] text-destructive font-medium">{errors.employeeId.message}</p>
              )}
            </div>
          )}

          {/* Document Number and Issuing Authority Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label={cfg.numberKey.startsWith("workforce.") ? t(cfg.numberKey) : cfg.numberKey}
              required
              error={errors.documentNumber?.message}
            >
              <div className="relative">
                <Hash className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register("documentNumber")}
                  placeholder="1000000000"
                  className="ps-9 font-mono font-semibold rounded-xl border-border/80 bg-muted/20"
                />
              </div>
            </FormField>

            <FormField
              label={cfg.authorityKey.startsWith("workforce.") ? t(cfg.authorityKey) : cfg.authorityKey}
              error={errors.issuingAuthority?.message}
            >
              <div className="relative">
                <Building className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register("issuingAuthority")}
                  placeholder={isAr ? "مثال: الرياض / بوبا / الخطوط السعودية" : "e.g. Bupa / Saudia"}
                  className="ps-9 rounded-xl border-border/80 bg-muted/20"
                />
              </div>
            </FormField>
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={t("workforce.iqamas.issueDate")} error={errors.issueDate?.message}>
              <Controller
                control={control}
                name="issueDate"
                render={({ field }) => (
                  <DateInput
                    value={field.value}
                    onChange={field.onChange}
                    className="font-mono text-xs rounded-xl border-border/80 bg-muted/20"
                  />
                )}
              />
            </FormField>

            <FormField label={t("workforce.iqamas.expiryDate")} error={errors.expiryDate?.message}>
              <Controller
                control={control}
                name="expiryDate"
                render={({ field }) => (
                  <DateInput
                    value={field.value}
                    onChange={field.onChange}
                    className="font-mono text-xs rounded-xl border-border/80 bg-muted/20"
                  />
                )}
              />
            </FormField>
          </div>

          {/* Attachment File */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              {t("workforce.dialog.attachments")}
            </label>
            <Controller
              name="fileId"
              control={control}
              render={({ field }) => (
                <FileUpload
                  fileId={field.value}
                  module="employee-documents"
                  onUploaded={(id) => field.onChange(id)}
                  onRemoved={() => field.onChange(undefined)}
                />
              )}
            />
          </div>

          {/* Notes */}
          <FormField label={t("workforce.dialog.notes")} error={errors.notes?.message}>
            <Textarea
              {...register("notes")}
              placeholder={isAr ? "أي تفاصيل أو ملاحظات إضافية..." : "Any additional notes..."}
              rows={2}
              className="rounded-xl border-border/80 bg-muted/20 text-xs"
            />
          </FormField>

          <DialogFooter className="border-t border-border/50 pt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl gap-2 font-semibold shadow-md min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {isEdit ? t("common.save") : t("common.create")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

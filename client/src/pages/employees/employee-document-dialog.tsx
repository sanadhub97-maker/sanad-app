import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Loader2,
  FileCheck2,
  CheckCircle2,
  FileBadge,
  FileText,
  Hash,
  Building,
  Calendar,
  CalendarCheck,
  CalendarClock,
  FileEdit,
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
import { employeeDocumentsApi } from "@/api/employees";
import { getErrorMessage } from "@/lib/api";
import { toDateInputValue } from "@/lib/utils";
import type { EmployeeDocument } from "@/types/models";

const DOCUMENT_TYPES = [
  "IQAMA",
  "PASSPORT",
  "HEALTH_CERTIFICATE",
  "MEDICAL_INSURANCE",
  "EMPLOYMENT_CONTRACT",
  "VISA",
  "EXIT_REENTRY_VISA",
  "FINAL_EXIT_VISA",
  "FLIGHT_TICKET",
  "DRIVING_LICENSE",
  "OTHER",
];

const schema = z.object({
  type: z.string().min(1),
  name: z.string().optional(),
  documentNumber: z.string().optional(),
  issuingAuthority: z.string().optional(),
  issueDate: z.string().optional(),
  startDate: z.string().optional(),
  expiryDate: z.string().optional(),
  fileId: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  employeeId: string;
  open: boolean;
  document?: EmployeeDocument;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeDocumentDialog({ employeeId, open, document, onOpenChange }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();
  const isEdit = Boolean(document);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "OTHER" },
  });

  useEffect(() => {
    if (open) {
      reset(
        document
          ? {
              type: document.type,
              name: document.name ?? "",
              documentNumber: document.documentNumber ?? "",
              issuingAuthority: document.issuingAuthority ?? "",
              issueDate: toDateInputValue(document.issueDate),
              startDate: toDateInputValue(document.startDate),
              expiryDate: toDateInputValue(document.expiryDate),
              fileId: document.fileId ?? undefined,
              notes: document.notes ?? "",
            }
          : { type: "OTHER" }
      );
    }
  }, [open, document, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit ? employeeDocumentsApi.update(employeeId, document!.id, values) : employeeDocumentsApi.create(employeeId, values),
    onSuccess: (res) => {
      toast.success(res.message ?? t("common.savedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["employees", employeeId] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-3xl border border-border/80 bg-background/95 backdrop-blur-xl p-0 shadow-2xl sm:max-w-3xl max-h-[92vh] flex flex-col">
        {/* 🌟 Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-44 w-80 rounded-full bg-gradient-to-b from-indigo-500/20 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* 🌟 Specular Glass Edge */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

        {/* 👑 Executive Dialog Header */}
        <DialogHeader className="p-6 pb-5 border-b border-border/60 bg-muted/15 relative z-10 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <AppleIcon icon={FileCheck2} tone="indigo" size="lg" />
              <div>
                <div className="flex items-center gap-2.5">
                  <DialogTitle className="text-xl font-black tracking-tight text-foreground font-sans">
                    {isEdit ? t("employees.documentDialog.editTitle") : t("employees.documentDialog.addTitle")}
                  </DialogTitle>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 shadow-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                    </span>
                    {isEdit ? (isAr ? "تعديل مستند موظف" : "Edit Doc") : (isAr ? "مستند جديد" : "New Document")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAr
                    ? "إضافة وتوثيق مستندات وملفات الموظف الرسمية وتواريخ صلاحيتها ومتابعة التجديد"
                    : "Attach and manage employee official documents, credentials, and track renewal dates"}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* 📝 Scrollable Form Body */}
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 🪪 Section 1: Document Classification & Details */}
          <div className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <FileBadge className="h-4 w-4 text-indigo-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? "نوع وتفاصيل الوثيقة" : "Document Classification"}
                </h3>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {isAr ? "النوع، الاسم، والرقم المعتمد" : "Classification & official number"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={t("employees.documentDialog.type")}
                icon={FileBadge}
                required
              >
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        {DOCUMENT_TYPES.map((docType) => (
                          <SelectItem key={docType} value={docType}>
                            {t(`documentTypes.${docType}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField
                label={t("employees.documentDialog.name")}
                icon={FileText}
                hint={isAr ? "مسمى اختياري للوثيقة" : "Optional custom label"}
              >
                <Input
                  {...register("name")}
                  placeholder={isAr ? "مثال: شهادة التأمين الطبي بوبا" : "e.g. Health Insurance Certificate"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/60"
                />
              </FormField>

              <FormField
                label={t("employees.documentDialog.number")}
                icon={Hash}
              >
                <Input
                  {...register("documentNumber")}
                  placeholder="DOC-12345"
                  className="h-11 rounded-xl font-mono bg-background/90 border-border/80 shadow-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/60"
                />
              </FormField>

              <FormField
                label={t("employees.documentDialog.issuingAuthority")}
                icon={Building}
              >
                <Input
                  {...register("issuingAuthority")}
                  placeholder={isAr ? "الجهة المصدرة للوثيقة" : "Issuing Authority"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/60"
                />
              </FormField>
            </div>
          </div>

          {/* 📅 Section 2: Validity Schedule */}
          <div className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? "تواريخ السريان والصلاحية" : "Validity Schedule"}
                </h3>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {isAr ? "متابعة انتهاء صلاحية الوثيقة" : "Track expiry dates"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={t("employees.documentDialog.issueDate")}
                icon={Calendar}
              >
                <Controller
                  control={control}
                  name="issueDate"
                  render={({ field }) => (
                    <DateInput
                      value={field.value}
                      onChange={field.onChange}
                      className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/60"
                    />
                  )}
                />
              </FormField>

              <FormField
                label={t("employees.documentDialog.startDate")}
                icon={CalendarCheck}
              >
                <Controller
                  control={control}
                  name="startDate"
                  render={({ field }) => (
                    <DateInput
                      value={field.value}
                      onChange={field.onChange}
                      className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/60"
                    />
                  )}
                />
              </FormField>

              <FormField
                label={t("employees.documentDialog.expiryDate")}
                icon={CalendarClock}
                className="sm:col-span-2"
                hint={isAr ? "هام لمنظومة التنبيهات" : "Triggers expiry notifications"}
              >
                <Controller
                  control={control}
                  name="expiryDate"
                  render={({ field }) => (
                    <DateInput
                      value={field.value}
                      onChange={field.onChange}
                      className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/60"
                    />
                  )}
                />
              </FormField>

              <FormField
                label={t("common.notes")}
                icon={FileEdit}
                className="sm:col-span-2"
              >
                <Textarea
                  {...register("notes")}
                  placeholder={isAr ? "ملاحظات إضافية حول الوثيقة، شروطها أو تجديدها..." : "Additional notes or renewal comments..."}
                  className="rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/60 resize-none min-h-[72px]"
                />
              </FormField>
            </div>
          </div>

          {/* 📎 Section 3: Attachment */}
          <div className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-indigo-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {t("employees.documentDialog.file")}
                </h3>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {isAr ? "نسخة PDF أو صورة عالية الدقة" : "PDF or high-res image"}
              </span>
            </div>

            <div className="rounded-xl border border-border/80 bg-background/60 p-2 shadow-inner">
              <FileUpload
                fileId={watch("fileId")}
                module="employee-document"
                onUploaded={(fid) => setValue("fileId", fid)}
                onRemoved={() => setValue("fileId", undefined)}
              />
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
              className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white font-bold text-sm px-6 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <CheckCircle2 className="h-4 w-4 me-2" />}
              <span>{isEdit ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "حفظ المستند" : "Save Document")}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

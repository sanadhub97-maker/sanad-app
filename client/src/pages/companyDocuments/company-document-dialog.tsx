import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Loader2,
  FileText,
  CheckCircle2,
  FolderKanban,
  Hash,
  ShieldCheck,
  Building,
  Building2,
  MapPin,
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
import { FileUpload } from "@/components/common/file-upload";
import { DateInput } from "@/components/common/date-input";
import { listActiveBranches } from "@/api/branches";
import { getErrorMessage } from "@/lib/api";
import { toDateInputValue, nullsToUndefined } from "@/lib/utils";
import type { CompanyDocument } from "@/types/models";
import type { createResourceApi } from "@/api/createResourceApi";
import type { CompanyDocumentInput } from "@/api/companyDocuments";

const schema = z.object({
  category: z.string().min(1),
  name: z.string().min(2, "Required"),
  documentNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  issuingAuthority: z.string().optional(),
  branchId: z.string().optional(),
  city: z.string().optional(),
  issueDate: z.string().optional(),
  startDate: z.string().optional(),
  expiryDate: z.string().optional(),
  fileId: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  api: ReturnType<typeof createResourceApi<CompanyDocument, CompanyDocumentInput>>;
  categories: readonly string[];
  queryKey: string;
  open: boolean;
  document?: CompanyDocument;
  onOpenChange: (open: boolean) => void;
}

export function CompanyDocumentDialog({ api, categories, queryKey, open, document, onOpenChange }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();
  const isEdit = Boolean(document);
  const { data: branches } = useQuery({ queryKey: ["branches", "active"], queryFn: listActiveBranches });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: categories[0] },
  });

  useEffect(() => {
    if (open) {
      reset(
        document
          ? (nullsToUndefined({
              ...document,
              branchId: document.branchId ?? undefined,
              issueDate: toDateInputValue(document.issueDate),
              startDate: toDateInputValue(document.startDate),
              expiryDate: toDateInputValue(document.expiryDate),
              fileId: document.fileId ?? undefined,
            }) as FormValues)
          : { category: categories[0] }
      );
    }
  }, [open, document, reset, categories]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => (isEdit ? api.update(document!.id, values) : api.create(values as CompanyDocumentInput)),
    onSuccess: (res) => {
      toast.success(res.message ?? t("common.savedSuccess"));
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-3xl border border-amber-500/30 dark:border-amber-500/20 bg-background/95 backdrop-blur-xl p-0 shadow-2xl w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col">
        {/* 🌟 Ambient Amber Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-44 w-96 rounded-full bg-gradient-to-b from-amber-500/20 via-orange-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* 🌟 Specular Glass Edge */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

        {/* 👑 Executive Dialog Header */}
        <DialogHeader className="p-6 sm:p-8 pb-5 border-b border-border/60 bg-muted/15 relative z-10 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <AppleIcon icon={FileText} tone="amber" size="lg" className="shadow-md" />
              <div>
                <div className="flex items-center gap-2.5">
                  <DialogTitle className="text-xl font-black tracking-tight text-foreground font-sans">
                    {isEdit ? t("companyDocuments.editDocument") : t("companyDocuments.addDocument")}
                  </DialogTitle>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                    </span>
                    {isEdit ? (isAr ? "تعديل سجل" : "Edit") : (isAr ? "وثيقة جديدة" : "New Document")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAr
                    ? "إدارة وتوثيق تراخيص وسجلات الشركة ومتابعة تواريخ الصلاحية والتجديد"
                    : "Manage legal company records, licenses, and track expiration timelines"}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* 📝 Scrollable Form Body */}
        <form id="company-doc-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 pb-12">
          {/* 📄 Section 1: Document Classification & Identity */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] dark:bg-amber-500/[0.04] p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-amber-500/10">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? "تصنيف وهوية الوثيقة" : "Document Identity & Numbers"}
                </h3>
              </div>
              <span className="text-[11px] font-medium text-amber-700/80 dark:text-amber-400/80">
                {isAr ? "النوع، الاسم، وأرقام التراخيص" : "Classification & numbers"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-12">
              <FormField
                label={t("companyDocuments.fields.category")}
                icon={FolderKanban}
                required
                className="sm:col-span-4"
              >
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {t(`documentCategories.${cat}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField
                label={t("companyDocuments.fields.name")}
                icon={FileText}
                required
                error={errors.name?.message}
                className="sm:col-span-4"
              >
                <Input
                  {...register("name")}
                  placeholder={isAr ? "مثال: السجل التجاري الرئيسي" : "e.g. Commercial Registration"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
                />
              </FormField>

              <FormField
                label={t("companyDocuments.fields.documentNumber")}
                icon={Hash}
                className="sm:col-span-4"
              >
                <Input
                  {...register("documentNumber")}
                  placeholder="1010000000"
                  className="h-11 rounded-xl font-mono bg-background/90 border-border/80 shadow-xs focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
                />
              </FormField>

              <FormField
                label={t("companyDocuments.fields.licenseNumber")}
                icon={ShieldCheck}
                className="sm:col-span-4"
              >
                <Input
                  {...register("licenseNumber")}
                  placeholder="LIC-4491"
                  className="h-11 rounded-xl font-mono bg-background/90 border-border/80 shadow-xs focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
                />
              </FormField>

              <FormField
                label={t("companyDocuments.fields.issuingAuthority")}
                icon={Building}
                className="sm:col-span-8"
              >
                <Input
                  {...register("issuingAuthority")}
                  placeholder={isAr ? "مثال: وزارة التجارة، أمانة منطقة الرياض، الدفاع المدني..." : "e.g. Ministry of Commerce / Municipality"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
                />
              </FormField>
            </div>
          </div>

          {/* 🏢 Section 2: Branch & Validity Timeline */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] dark:bg-amber-500/[0.04] p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-amber-500/10">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? "المؤسسة وفترات الصلاحية والتجديد" : "Location & Validity Schedule"}
                </h3>
              </div>
              <span className="text-[11px] font-medium text-amber-700/80 dark:text-amber-400/80">
                {isAr ? "تواريخ الانتهاء للتنبيهات الاستباقية" : "Track compliance & alerts"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-12">
              <FormField
                label={t("companyDocuments.fields.branch")}
                icon={Building2}
                className="sm:col-span-6"
              >
                <Controller
                  control={control}
                  name="branchId"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15">
                        <SelectValue placeholder={t("companyDocuments.fields.selectBranch")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        {(branches ?? []).map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            <bdi>{b.name}</bdi>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField
                label={t("companyDocuments.fields.city")}
                icon={MapPin}
                className="sm:col-span-6"
              >
                <Input
                  {...register("city")}
                  placeholder={isAr ? "الرياض، جدة، الخبر..." : "City"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
                />
              </FormField>

              <FormField
                label={t("companyDocuments.fields.issueDate")}
                icon={Calendar}
                className="sm:col-span-4"
              >
                <Controller
                  control={control}
                  name="issueDate"
                  render={({ field }) => (
                    <DateInput
                      value={field.value}
                      onChange={field.onChange}
                      className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
                    />
                  )}
                />
              </FormField>

              <FormField
                label={t("companyDocuments.fields.startDate")}
                icon={CalendarCheck}
                className="sm:col-span-4"
              >
                <Controller
                  control={control}
                  name="startDate"
                  render={({ field }) => (
                    <DateInput
                      value={field.value}
                      onChange={field.onChange}
                      className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
                    />
                  )}
                />
              </FormField>

              <FormField
                label={t("companyDocuments.fields.expiryDate")}
                icon={CalendarClock}
                className="sm:col-span-4"
                hint={isAr ? "مهم لإشعارات التجديد" : "Triggers expiry alerts"}
              >
                <Controller
                  control={control}
                  name="expiryDate"
                  render={({ field }) => (
                    <DateInput
                      value={field.value}
                      onChange={field.onChange}
                      className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
                    />
                  )}
                />
              </FormField>

              <FormField
                label={t("companyDocuments.fields.notes")}
                icon={FileEdit}
                className="sm:col-span-12"
              >
                <Textarea
                  {...register("notes")}
                  placeholder={isAr ? "ملاحظات إضافية حول الوثيقة، شروط التجديد، أو الرسوم..." : "Additional notes or renewal conditions..."}
                  className="rounded-xl bg-background/90 border-border/80 shadow-xs focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 resize-none min-h-[72px]"
                />
              </FormField>
            </div>
          </div>

          {/* 📎 Section 3: Attachment */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] dark:bg-amber-500/[0.04] p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-amber-500/10">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {t("companyDocuments.fields.attachment")}
                </h3>
              </div>
              <span className="text-[11px] font-medium text-amber-700/80 dark:text-amber-400/80">
                {isAr ? "ملف PDF أو صورة عالية الدقة" : "PDF or scanned file"}
              </span>
            </div>

            <div className="rounded-xl border border-border/80 bg-background/60 p-2 shadow-inner">
              <FileUpload
                fileId={watch("fileId")}
                module="company-document"
                onUploaded={(fid) => setValue("fileId", fid)}
                onRemoved={() => setValue("fileId", undefined)}
              />
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
            form="company-doc-form"
            type="submit"
            disabled={isSubmitting}
            className="h-11 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white font-bold text-sm px-8 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <CheckCircle2 className="h-4 w-4 me-2" />}
            <span>{isEdit ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "حفظ الوثيقة" : "Save Document")}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

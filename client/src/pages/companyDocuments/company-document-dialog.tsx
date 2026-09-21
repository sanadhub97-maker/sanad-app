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
      <DialogContent className="overflow-hidden rounded-3xl border border-border/80 bg-background/95 backdrop-blur-xl p-0 shadow-2xl sm:max-w-3xl max-h-[92vh] flex flex-col">
        {/* 🌟 Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-44 w-80 rounded-full bg-gradient-to-b from-cyan-500/20 via-teal-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* 🌟 Specular Glass Edge */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        {/* 👑 Executive Dialog Header */}
        <DialogHeader className="p-6 pb-5 border-b border-border/60 bg-muted/15 relative z-10 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <AppleIcon icon={FileText} tone="cyan" size="lg" />
              <div>
                <div className="flex items-center gap-2.5">
                  <DialogTitle className="text-xl font-black tracking-tight text-foreground font-sans">
                    {isEdit ? t("companyDocuments.editDocument") : t("companyDocuments.addDocument")}
                  </DialogTitle>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 border border-cyan-500/25 shadow-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
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
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 📄 Section 1: Document Classification & Identity */}
          <div className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-cyan-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? "تصنيف وهوية الوثيقة" : "Document Identity & Numbers"}
                </h3>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {isAr ? "النوع، الاسم، وأرقام التراخيص" : "Classification & numbers"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={t("companyDocuments.fields.category")}
                icon={FolderKanban}
                required
              >
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/60">
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
              >
                <Input
                  {...register("name")}
                  placeholder={isAr ? "مثال: السجل التجاري الرئيسي" : "e.g. Commercial Registration"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/60"
                />
              </FormField>

              <FormField
                label={t("companyDocuments.fields.documentNumber")}
                icon={Hash}
              >
                <Input
                  {...register("documentNumber")}
                  placeholder="1010000000"
                  className="h-11 rounded-xl font-mono bg-background/90 border-border/80 shadow-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/60"
                />
              </FormField>

              <FormField
                label={t("companyDocuments.fields.licenseNumber")}
                icon={ShieldCheck}
              >
                <Input
                  {...register("licenseNumber")}
                  placeholder="LIC-4491"
                  className="h-11 rounded-xl font-mono bg-background/90 border-border/80 shadow-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/60"
                />
              </FormField>

              <FormField
                label={t("companyDocuments.fields.issuingAuthority")}
                icon={Building}
                className="sm:col-span-2"
              >
                <Input
                  {...register("issuingAuthority")}
                  placeholder={isAr ? "مثال: وزارة التجارة، أمانة منطقة الرياض، الدفاع المدني..." : "e.g. Ministry of Commerce / Municipality"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/60"
                />
              </FormField>
            </div>
          </div>

          {/* 🏢 Section 2: Branch & Validity Timeline */}
          <div className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-cyan-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? "المؤسسة وفترات الصلاحية والتجديد" : "Location & Validity Schedule"}
                </h3>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {isAr ? "تواريخ الانتهاء للتنبيهات الاستباقية" : "Track compliance & alerts"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={t("companyDocuments.fields.branch")}
                icon={Building2}
              >
                <Controller
                  control={control}
                  name="branchId"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/60">
                        <SelectValue placeholder={t("companyDocuments.fields.selectBranch")} />
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

              <FormField
                label={t("companyDocuments.fields.city")}
                icon={MapPin}
              >
                <Input
                  {...register("city")}
                  placeholder={isAr ? "الرياض، جدة، الخبر..." : "City"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/60"
                />
              </FormField>

              <FormField
                label={t("companyDocuments.fields.issueDate")}
                icon={Calendar}
              >
                <Input
                  type="date"
                  {...register("issueDate")}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/60"
                />
              </FormField>

              <FormField
                label={t("companyDocuments.fields.startDate")}
                icon={CalendarCheck}
              >
                <Input
                  type="date"
                  {...register("startDate")}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/60"
                />
              </FormField>

              <FormField
                label={t("companyDocuments.fields.expiryDate")}
                icon={CalendarClock}
                className="sm:col-span-2"
                hint={isAr ? "مهم لإشعارات التجديد" : "Triggers expiry alerts"}
              >
                <Input
                  type="date"
                  {...register("expiryDate")}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/60"
                />
              </FormField>

              <FormField
                label={t("companyDocuments.fields.notes")}
                icon={FileEdit}
                className="sm:col-span-2"
              >
                <Textarea
                  {...register("notes")}
                  placeholder={isAr ? "ملاحظات إضافية حول الوثيقة، شروط التجديد، أو الرسوم..." : "Additional notes or renewal conditions..."}
                  className="rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/60 resize-none min-h-[72px]"
                />
              </FormField>
            </div>
          </div>

          {/* 📎 Section 3: Attachment */}
          <div className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-cyan-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {t("companyDocuments.fields.attachment")}
                </h3>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
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
              className="h-11 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 text-white font-bold text-sm px-6 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <CheckCircle2 className="h-4 w-4 me-2" />}
              <span>{isEdit ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "حفظ الوثيقة" : "Save Document")}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

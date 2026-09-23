import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Loader2,
  CreditCard,
  CheckCircle2,
  Receipt,
  DollarSign,
  Percent,
  Hash,
  Calendar,
  FolderOpen,
  Building2,
  User,
  Building,
  FileCheck,
  FileText,
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
import { paymentsApi, PAYMENT_CATEGORIES, PAYMENT_METHODS } from "@/api/payments";
import { getErrorMessage } from "@/lib/api";
import { toDateInputValue, nullsToUndefined } from "@/lib/utils";
import type { Payment } from "@/types/models";

const schema = z.object({
  paymentNumber: z.string().optional(),
  paymentDate: z.string().min(1, "Required"),
  category: z.string().min(1),
  description: z.string().optional(),
  amount: z.coerce.number().positive("Must be greater than 0"),
  vat: z.coerce.number().min(0).default(0),
  method: z.string().min(1),
  paidBy: z.string().optional(),
  branchId: z.string().optional(),
  supplierName: z.string().optional(),
  referenceNumber: z.string().optional(),
  fileId: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function PaymentDialog({
  open,
  payment,
  onOpenChange,
}: {
  open: boolean;
  payment?: Payment;
  onOpenChange: (o: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();
  const isEdit = Boolean(payment);
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
    defaultValues: {
      category: PAYMENT_CATEGORIES[0],
      method: PAYMENT_METHODS[0],
      vat: 0,
      paymentDate: new Date().toISOString().slice(0, 10),
    },
  });

  const amount = watch("amount") || 0;
  const vat = watch("vat") || 0;
  const total = (Number(amount) + Number(vat)).toFixed(2);

  useEffect(() => {
    if (open) {
      reset(
        payment
          ? (nullsToUndefined({
              ...payment,
              branchId: payment.branchId ?? undefined,
              paymentDate: toDateInputValue(payment.paymentDate),
              fileId: payment.fileId ?? undefined,
            }) as FormValues)
          : {
              category: PAYMENT_CATEGORIES[0],
              method: PAYMENT_METHODS[0],
              vat: 0,
              paymentDate: new Date().toISOString().slice(0, 10),
            }
      );
    }
  }, [open, payment, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => (isEdit ? paymentsApi.update(payment!.id, values) : paymentsApi.create(values)),
    onSuccess: (res) => {
      toast.success(res.message ?? (isAr ? "تم حفظ سند الصرف بنجاح" : "Payment saved successfully."));
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-3xl border border-border/80 bg-background/95 backdrop-blur-xl p-0 shadow-2xl w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col">
        {/* 🌟 Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-44 w-96 rounded-full bg-gradient-to-b from-rose-500/20 via-pink-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* 🌟 Specular Glass Edge */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/50 to-transparent" />

        {/* 👑 Executive Dialog Header */}
        <DialogHeader className="p-6 pb-5 border-b border-border/60 bg-muted/15 relative z-10 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <AppleIcon icon={CreditCard} tone="rose" size="lg" />
              <div>
                <div className="flex items-center gap-2.5">
                  <DialogTitle className="text-xl font-black tracking-tight text-foreground font-sans">
                    {isEdit ? (isAr ? "تعديل سند الصرف" : "Edit Payment") : (isAr ? "إضافة سند صرف جديد" : "New Payment Voucher")}
                  </DialogTitle>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/25 shadow-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                    </span>
                    {isEdit ? (isAr ? "تعديل سجل" : "Edit") : (isAr ? "سند جديد" : "New Voucher")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAr
                    ? "توثيق القيود المالية والمصروفات التشغيلية وحساب الضريبة وإيصالات السداد"
                    : "Record financial expenditures, VAT calculation, and proof of payment"}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* 📝 Scrollable Form Body */}
        <form id="payment-dialog-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 pb-12">
          {/* 💰 Section 1: Financial Calculations */}
          <div className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-rose-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? "الحسابات والمبالغ المالية" : "Financial Calculations"}
                </h3>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {isAr ? "المبلغ والضريبة والإجمالي" : "Base amount & VAT"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={isAr ? "المبلغ الأساسي (بدون الضريبة)" : "Base Amount (excl. VAT)"}
                icon={DollarSign}
                required
                error={errors.amount?.message}
              >
                <Input
                  type="number"
                  step="0.01"
                  dir="ltr"
                  placeholder="0.00"
                  {...register("amount")}
                  className="h-11 rounded-xl font-bold font-mono text-base bg-background/90 border-border/80 shadow-xs focus-visible:ring-rose-500/30 focus-visible:border-rose-500/60"
                />
              </FormField>

              <FormField
                label={isAr ? "ضريبة القيمة المضافة (VAT)" : "VAT Amount"}
                icon={Percent}
                hint={isAr ? "اختياري" : "Optional"}
              >
                <Input
                  type="number"
                  step="0.01"
                  dir="ltr"
                  placeholder="0.00"
                  {...register("vat")}
                  className="h-11 rounded-xl font-bold font-mono text-base bg-background/90 border-border/80 shadow-xs focus-visible:ring-rose-500/30 focus-visible:border-rose-500/60"
                />
              </FormField>
            </div>

            {/* 💎 Total KPI Preview Card */}
            <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-xs">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    {isAr ? "المبلغ الإجمالي المستحق (شامل الضريبة)" : "Total Payable (incl. VAT)"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {isAr ? "حساب فوري تلقائي" : "Live auto-calculated"}
                  </span>
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400">
                {total} <span className="text-xs font-bold text-muted-foreground uppercase">{isAr ? "ر.س" : "SAR"}</span>
              </div>
            </div>
          </div>

          {/* 📝 Section 2: Transaction Details */}
          <div className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-rose-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? "تفاصيل وبيانات السند" : "Voucher & Payment Details"}
                </h3>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {isAr ? "التصنيف، طريقة الدفع، والمؤسسة" : "Category, method, & establishment"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                label={isAr ? "رقم السند" : "Payment Number"}
                icon={Hash}
                hint={isAr ? "تلقائي إن ترك فارغاً" : "Auto if empty"}
              >
                <Input
                  placeholder="PAY-0001"
                  {...register("paymentNumber")}
                  disabled={isEdit}
                  className="h-11 rounded-xl font-mono font-bold bg-background/90 border-border/80 shadow-xs focus-visible:ring-rose-500/30 focus-visible:border-rose-500/60"
                />
              </FormField>

              <FormField
                label={isAr ? "تاريخ السند" : "Payment Date"}
                icon={Calendar}
                required
                error={errors.paymentDate?.message}
              >
                <Controller
                  control={control}
                  name="paymentDate"
                  render={({ field }) => (
                    <DateInput
                      value={field.value}
                      onChange={field.onChange}
                      className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-rose-500/30 focus-visible:border-rose-500/60"
                    />
                  )}
                />
              </FormField>

              <FormField
                label={isAr ? "بند الصرف / التصنيف" : "Category"}
                icon={FolderOpen}
                required
              >
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-rose-500/30 focus-visible:border-rose-500/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        {PAYMENT_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {t(`paymentCategories.${c}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField
                label={isAr ? "طريقة الدفع" : "Payment Method"}
                icon={CreditCard}
                required
              >
                <Controller
                  control={control}
                  name="method"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-rose-500/30 focus-visible:border-rose-500/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {t(`paymentMethods.${m}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField
                label={isAr ? "المؤسسة التابع لها" : "Establishment"}
                icon={Building2}
              >
                <Controller
                  control={control}
                  name="branchId"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-rose-500/30 focus-visible:border-rose-500/60">
                        <SelectValue placeholder={isAr ? "اختر المؤسسة" : "Select establishment"} />
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
                label={isAr ? "القائم بالصرف" : "Paid By"}
                icon={User}
              >
                <Input
                  {...register("paidBy")}
                  placeholder={isAr ? "اسم الموظف أو المفوض" : "Employee or agent name"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-rose-500/30 focus-visible:border-rose-500/60"
                />
              </FormField>

              <FormField
                label={isAr ? "المورد / المستفيد" : "Supplier / Beneficiary"}
                icon={Building}
              >
                <Input
                  {...register("supplierName")}
                  placeholder={isAr ? "اسم الشركة أو الجهة المستفيدة" : "Vendor or beneficiary name"}
                  className="h-11 rounded-xl font-medium bg-background/90 border-border/80 shadow-xs focus-visible:ring-rose-500/30 focus-visible:border-rose-500/60"
                />
              </FormField>

              <FormField
                label={isAr ? "رقم المرجع / الفاتورة" : "Reference / Invoice #"}
                icon={Hash}
              >
                <Input
                  {...register("referenceNumber")}
                  placeholder="INV-9921"
                  className="h-11 rounded-xl font-mono bg-background/90 border-border/80 shadow-xs focus-visible:ring-rose-500/30 focus-visible:border-rose-500/60"
                />
              </FormField>

              <FormField
                label={isAr ? "البيان / الوصف" : "Description"}
                icon={FileText}
                className="sm:col-span-2 lg:col-span-3"
              >
                <Textarea
                  {...register("description")}
                  placeholder={isAr ? "شرح تفصيلي لسبب الصرف والبنود المغطاة..." : "Detailed reason for payment..."}
                  className="rounded-xl bg-background/90 border-border/80 shadow-xs focus-visible:ring-rose-500/30 focus-visible:border-rose-500/60 resize-none min-h-[72px]"
                />
              </FormField>
            </div>
          </div>

          {/* 📎 Section 3: Receipt & Attachment */}
          <div className="rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-sm p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-rose-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {isAr ? "إيصال السداد والمرفقات" : "Receipt & Documents"}
                </h3>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {isAr ? "صورة الإيصال أو ملف PDF" : "PDF or receipt image"}
              </span>
            </div>

            <div className="rounded-xl border border-border/80 bg-background/60 p-2 shadow-inner">
              <FileUpload
                fileId={watch("fileId")}
                module="payment"
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
            form="payment-dialog-form"
            type="submit"
            disabled={isSubmitting}
            className="h-11 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 text-white font-bold text-sm px-8 shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <CheckCircle2 className="h-4 w-4 me-2" />}
            <span>{isEdit ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "حفظ سند الصرف" : "Save Payment")}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

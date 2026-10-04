import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CreditCard,
  FileText,
  Landmark,
  Receipt,
  Scale,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { taxReturnsApi, type TaxReturnInput } from "@/api/taxReturns";
import type { TaxReturn, TaxReturnKind, TaxReturnStatus } from "@/types/models";

interface TaxReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taxReturn?: TaxReturn | null;
  defaultKind?: TaxReturnKind;
  defaultYear?: number;
  defaultQuarter?: number;
  onSaved: () => void;
}

export function TaxReturnDialog({
  open,
  onOpenChange,
  taxReturn,
  defaultKind = "VAT",
  defaultYear = new Date().getFullYear(),
  defaultQuarter,
  onSaved,
}: TaxReturnDialogProps) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<TaxReturnKind>(defaultKind);
  const [year, setYear] = useState<number>(defaultYear);
  const [quarter, setQuarter] = useState<number>(defaultQuarter || 3);
  const [dueDate, setDueDate] = useState<string>("");
  const [status, setStatus] = useState<TaxReturnStatus>("DRAFT");

  // VAT specific
  const [salesStandard, setSalesStandard] = useState<number>(0);
  const [salesZero, setSalesZero] = useState<number>(0);
  const [salesExports, setSalesExports] = useState<number>(0);
  const [salesExempt, setSalesExempt] = useState<number>(0);

  const [purchasesStandard, setPurchasesStandard] = useState<number>(0);
  const [purchasesImports, setPurchasesImports] = useState<number>(0);
  const [purchasesZero, setPurchasesZero] = useState<number>(0);
  const [purchasesExempt, setPurchasesExempt] = useState<number>(0);

  const [outputVat, setOutputVat] = useState<number>(0);
  const [inputVat, setInputVat] = useState<number>(0);
  const [corrections, setCorrections] = useState<number>(0);

  // Zakat specific
  const [zakatBase, setZakatBase] = useState<number>(0);

  // General fields
  const [amount, setAmount] = useState<number>(0);
  const [penalty, setPenalty] = useState<number>(0);
  const [filedDate, setFiledDate] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [sadadNumber, setSadadNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Auto-calculated VAT
  const computedOutputVat = Math.round(salesStandard * 0.15 * 100) / 100;
  const computedInputVat = Math.round(purchasesStandard * 0.15 * 100) / 100;
  const computedNetVat = Math.round((computedOutputVat - computedInputVat + Number(corrections || 0)) * 100) / 100;

  // Auto-calculated Zakat (2.5%)
  const computedZakatAmount = Math.round(zakatBase * 0.025 * 100) / 100;

  // Sync state when editing or opening
  useEffect(() => {
    if (taxReturn) {
      setKind(taxReturn.kind);
      setYear(taxReturn.year);
      setQuarter(taxReturn.quarter || 1);
      setDueDate(taxReturn.dueDate ? taxReturn.dueDate.slice(0, 10) : "");
      setStatus(taxReturn.status);
      setSalesStandard(taxReturn.salesStandard);
      setSalesZero(taxReturn.salesZero);
      setSalesExports(taxReturn.salesExports);
      setSalesExempt(taxReturn.salesExempt);
      setPurchasesStandard(taxReturn.purchasesStandard);
      setPurchasesImports(taxReturn.purchasesImports);
      setPurchasesZero(taxReturn.purchasesZero);
      setPurchasesExempt(taxReturn.purchasesExempt);
      setOutputVat(taxReturn.outputVat);
      setInputVat(taxReturn.inputVat);
      setCorrections(taxReturn.corrections);
      setZakatBase(taxReturn.zakatBase || 0);
      setAmount(taxReturn.amount);
      setPenalty(taxReturn.penalty);
      setFiledDate(taxReturn.filedDate ? taxReturn.filedDate.slice(0, 10) : "");
      setReference(taxReturn.reference || "");
      setSadadNumber(taxReturn.sadadNumber || "");
      setNotes(taxReturn.notes || "");
    } else {
      setKind(defaultKind);
      setYear(defaultYear);
      setQuarter(defaultQuarter || 3);
      setStatus("DRAFT");
      setSalesStandard(0);
      setSalesZero(0);
      setSalesExports(0);
      setSalesExempt(0);
      setPurchasesStandard(0);
      setPurchasesImports(0);
      setPurchasesZero(0);
      setPurchasesExempt(0);
      setOutputVat(0);
      setInputVat(0);
      setCorrections(0);
      setZakatBase(0);
      setAmount(0);
      setPenalty(0);
      setFiledDate("");
      setReference("");
      setSadadNumber("");
      setNotes("");

      // default due dates according to ZATCA rules
      if (defaultKind === "VAT") {
        const q = defaultQuarter || 3;
        if (q === 1) setDueDate(`${defaultYear}-04-30`);
        else if (q === 2) setDueDate(`${defaultYear}-07-31`);
        else if (q === 3) setDueDate(`${defaultYear}-10-31`);
        else if (q === 4) setDueDate(`${defaultYear + 1}-01-31`);
      } else {
        setDueDate(`${defaultYear + 1}-04-30`);
      }
    }
  }, [taxReturn, defaultKind, defaultYear, defaultQuarter, open]);

  // Adjust due date when quarter or year changes for new returns
  const handleQuarterChange = (q: number) => {
    setQuarter(q);
    if (!taxReturn) {
      if (q === 1) setDueDate(`${year}-04-30`);
      else if (q === 2) setDueDate(`${year}-07-31`);
      else if (q === 3) setDueDate(`${year}-10-31`);
      else if (q === 4) setDueDate(`${year + 1}-01-31`);
    }
  };

  const handleKindChange = (k: TaxReturnKind) => {
    setKind(k);
    if (!taxReturn) {
      if (k === "VAT") {
        handleQuarterChange(quarter);
      } else {
        setDueDate(`${year + 1}-04-30`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate) {
      toast.error(isAr ? "يرجى تحديد تاريخ الاستحقاق" : "Please specify due date");
      return;
    }

    setSaving(true);
    try {
      const finalOutputVat = kind === "VAT" ? (outputVat || computedOutputVat) : 0;
      const finalInputVat = kind === "VAT" ? (inputVat || computedInputVat) : 0;
      const finalAmount =
        kind === "VAT"
          ? (amount !== 0 ? amount : computedNetVat)
          : (amount !== 0 ? amount : computedZakatAmount);

      const payload: TaxReturnInput = {
        kind,
        year: Number(year),
        quarter: kind === "VAT" ? Number(quarter) : null,
        dueDate,
        status,
        salesStandard: kind === "VAT" ? Number(salesStandard) : 0,
        salesZero: kind === "VAT" ? Number(salesZero) : 0,
        salesExports: kind === "VAT" ? Number(salesExports) : 0,
        salesExempt: kind === "VAT" ? Number(salesExempt) : 0,
        purchasesStandard: kind === "VAT" ? Number(purchasesStandard) : 0,
        purchasesImports: kind === "VAT" ? Number(purchasesImports) : 0,
        purchasesZero: kind === "VAT" ? Number(purchasesZero) : 0,
        purchasesExempt: kind === "VAT" ? Number(purchasesExempt) : 0,
        outputVat: finalOutputVat,
        inputVat: finalInputVat,
        corrections: kind === "VAT" ? Number(corrections) : 0,
        zakatBase: kind === "ZAKAT" ? Number(zakatBase) : null,
        amount: finalAmount,
        penalty: Number(penalty || 0),
        filedDate: filedDate || null,
        reference: reference.trim() || null,
        sadadNumber: sadadNumber.trim() || null,
        notes: notes.trim() || null,
      };

      if (taxReturn) {
        await taxReturnsApi.update(taxReturn.id, payload);
        toast.success(isAr ? "تم تحديث الإقرار بنجاح" : "Tax return updated successfully");
      } else {
        await taxReturnsApi.create(payload);
        toast.success(isAr ? "تم تسجيل الإقرار بنجاح" : "Tax return recorded successfully");
      }

      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || (isAr ? "حدث خطأ أثناء حفظ الإقرار" : "Failed to save return"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/20 dark:border-white/10 bg-background/80 backdrop-blur-2xl shadow-2xl p-6 sm:p-8">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {taxReturn
                  ? isAr
                    ? "تعديل الإقرار الضريبي / الزكوي"
                    : "Edit Tax / Zakat Return"
                  : isAr
                  ? "تسجيل إقرار جديد (ضريبة / زكاة)"
                  : "Record New Tax / Zakat Return"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isAr
                  ? "إدخال بيانات ومبالغ الإقرار مع الحساب الآلي لضريبة القيمة المضافة ونسبة الزكاة الشرعية"
                  : "Enter declaration details with automated VAT and Zakat calculations"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Kind Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">
              {isAr ? "نوع الإقرار" : "Declaration Type"}
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleKindChange("VAT")}
                disabled={Boolean(taxReturn)}
                className={`relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200 text-start ${
                  kind === "VAT"
                    ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/30 font-semibold"
                    : "border-border/50 hover:border-border bg-card/40 text-foreground"
                }`}
              >
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold">
                    {isAr ? "إقرار ضريبة القيمة المضافة (VAT)" : "Value Added Tax (VAT)"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isAr ? "إقرارات ربع سنوية (Q1 - Q4)" : "Quarterly filing (Q1 - Q4)"}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleKindChange("ZAKAT")}
                disabled={Boolean(taxReturn)}
                className={`relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200 text-start ${
                  kind === "ZAKAT"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/30 font-semibold"
                    : "border-border/50 hover:border-border bg-card/40 text-foreground"
                }`}
              >
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Scale className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold">
                    {isAr ? "إقرار الزكاة الشرعية (Zakat)" : "Annual Zakat Return"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isAr ? "إقرار سنوي (2.5% من الوعاء)" : "Annual filing (2.5% base)"}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Year and Quarter / Period */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{isAr ? "السنة المالية" : "Fiscal Year"}</Label>
              <Select
                value={String(year)}
                onValueChange={(v) => {
                  setYear(Number(v));
                  if (!taxReturn) {
                    if (kind === "VAT") {
                      if (quarter === 1) setDueDate(`${v}-04-30`);
                      else if (quarter === 2) setDueDate(`${v}-07-31`);
                      else if (quarter === 3) setDueDate(`${v}-10-31`);
                      else if (quarter === 4) setDueDate(`${Number(v) + 1}-01-31`);
                    } else {
                      setDueDate(`${Number(v) + 1}-04-30`);
                    }
                  }
                }}
              >
                <SelectTrigger className="rounded-xl border-border/60">
                  <SelectValue placeholder={year} />
                </SelectTrigger>
                <SelectContent>
                  {[2027, 2026, 2025, 2024, 2023].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {kind === "VAT" ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{isAr ? "الربع السنوي" : "Quarter"}</Label>
                <Select value={String(quarter)} onValueChange={(v) => handleQuarterChange(Number(v))}>
                  <SelectTrigger className="rounded-xl border-border/60">
                    <SelectValue placeholder={`Q${quarter}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{isAr ? "الربع الأول Q1 (يناير - مارس)" : "Q1 (Jan - Mar)"}</SelectItem>
                    <SelectItem value="2">{isAr ? "الربع الثاني Q2 (أبريل - يونيو)" : "Q2 (Apr - Jun)"}</SelectItem>
                    <SelectItem value="3">{isAr ? "الربع الثالث Q3 (يوليو - سبتمبر)" : "Q3 (Jul - Sep)"}</SelectItem>
                    <SelectItem value="4">{isAr ? "الربع الرابع Q4 (أكتوبر - ديسمبر)" : "Q4 (Oct - Dec)"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{isAr ? "الفترة الزكوية" : "Zakat Period"}</Label>
                <Input
                  disabled
                  value={isAr ? `إقرار زكاة عام ${year} المالي` : `Fiscal Year ${year} Zakat`}
                  className="rounded-xl bg-muted/40"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{isAr ? "تاريخ الاستحقاق (ZATCA)" : "Due Date"}</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="rounded-xl border-border/60"
              />
            </div>
          </div>

          {/* Conditional VAT Fields */}
          {kind === "VAT" && (
            <div className="space-y-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-bold text-amber-950 dark:text-amber-200">
                    {isAr ? "بيانات المبيعات والمشتريات والضريبة" : "VAT Sales & Purchases Boxes"}
                  </span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
                  {isAr ? "نسبة 15% أساسية" : "Standard 15% Rate"}
                </span>
              </div>

              {/* Sales Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {isAr ? "المبيعات الخاضعة للنسبة الأساسية (15%)" : "Standard Rated Sales (15%)"}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={salesStandard || ""}
                      onChange={(e) => setSalesStandard(Number(e.target.value))}
                      placeholder="0.00"
                      className="rounded-xl pl-12 border-border/60"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">SAR</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {isAr ? "ضريبة المخرجات (15%) المحسوبة" : "Calculated Output VAT (15%)"}
                  </Label>
                  <div className="flex items-center justify-between h-9 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-sm">
                    <span>{computedOutputVat.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    <span className="text-xs font-normal opacity-80">SAR</span>
                  </div>
                </div>
              </div>

              {/* Purchases Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {isAr ? "المشتريات الخاضعة للنسبة الأساسية (15%)" : "Standard Rated Purchases (15%)"}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={purchasesStandard || ""}
                      onChange={(e) => setPurchasesStandard(Number(e.target.value))}
                      placeholder="0.00"
                      className="rounded-xl pl-12 border-border/60"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">SAR</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {isAr ? "ضريبة المدخلات (15%) المحسوبة" : "Calculated Input VAT (15%)"}
                  </Label>
                  <div className="flex items-center justify-between h-9 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-sm">
                    <span>{computedInputVat.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    <span className="text-xs font-normal opacity-80">SAR</span>
                  </div>
                </div>
              </div>

              {/* Additional boxes toggle or sub-fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    {isAr ? "مبيعات صفرية ومعفاة" : "Zero-rated / Exempt Sales"}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salesZero || ""}
                    onChange={(e) => setSalesZero(Number(e.target.value))}
                    placeholder="0.00"
                    className="rounded-lg h-8 text-xs border-border/60"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    {isAr ? "مشتريات مستوردة أو معفاة" : "Imports / Exempt Purchases"}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={purchasesImports || ""}
                    onChange={(e) => setPurchasesImports(Number(e.target.value))}
                    placeholder="0.00"
                    className="rounded-lg h-8 text-xs border-border/60"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    {isAr ? "تسويات فترات سابقة (+/-)" : "Corrections / Adjustments"}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={corrections || ""}
                    onChange={(e) => setCorrections(Number(e.target.value))}
                    placeholder="0.00"
                    className="rounded-lg h-8 text-xs border-border/60"
                  />
                </div>
              </div>

              {/* Net VAT Badge */}
              <div className="mt-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-950 dark:text-amber-200">
                    {isAr ? "صافي ضريبة القيمة المضافة المستحقة (أو المستردة)" : "Net VAT Payable / (Refundable)"}
                  </div>
                  <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                    {isAr ? "ضريبة المخرجات - ضريبة المدخلات + التسويات" : "Output VAT - Input VAT + Adjustments"}
                  </div>
                </div>
                <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                  {computedNetVat.toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR
                </div>
              </div>
            </div>
          )}

          {/* Conditional Zakat Fields */}
          {kind === "ZAKAT" && (
            <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                    {isAr ? "الوعاء الزكوي والزكاة الشرعية المستحقة" : "Zakat Base & Payable Liability"}
                  </span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium">
                  {isAr ? "نسبة الزكاة 2.5%" : "Zakat Rate 2.5%"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {isAr ? "الوعاء الزكوي التقديري / الفعلي (SAR)" : "Zakat Base Amount (SAR)"}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={zakatBase || ""}
                      onChange={(e) => setZakatBase(Number(e.target.value))}
                      placeholder="0.00"
                      className="rounded-xl pl-12 border-border/60"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">SAR</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {isAr ? "مبلغ الزكاة الشرعية (2.5%) المحسوبة" : "Calculated Zakat (2.5%)"}
                  </Label>
                  <div className="flex items-center justify-between h-9 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                    <span>{computedZakatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    <span className="text-xs font-normal opacity-80">SAR</span>
                  </div>
                </div>
              </div>

              {/* Zakat Badge */}
              <div className="mt-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    {isAr ? "المبلغ النهائي المستحق للزكاة" : "Net Zakat Payable"}
                  </div>
                  <div className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                    {isAr ? "الواجب سداده لهيئة الزكاة والضريبة والجمارك" : "Due to ZATCA by declaration deadline"}
                  </div>
                </div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {computedZakatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR
                </div>
              </div>
            </div>
          )}

          {/* Status, SADAD, Reference, Filing Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{isAr ? "حالة الإقرار" : "Filing Status"}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaxReturnStatus)}>
                <SelectTrigger className="rounded-xl border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">{isAr ? "مسودة (غير مقدم)" : "Draft (Not filed)"}</SelectItem>
                  <SelectItem value="FILED">{isAr ? "تم التقديم (بانتظار السداد)" : "Filed (Awaiting payment)"}</SelectItem>
                  <SelectItem value="PAID">{isAr ? "تم التقديم والسداد بالكامل" : "Filed & Paid in Full"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isAr ? "رقم فاتورة سداد (SADAD Bill No.)" : "SADAD Bill Number"}
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  value={sadadNumber}
                  onChange={(e) => setSadadNumber(e.target.value)}
                  placeholder="e.g. 2489012345"
                  className="rounded-xl pr-10 border-border/60 font-mono"
                />
                <CreditCard className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isAr ? "الرقم المرجعي للإقرار (ZATCA Reference)" : "Filing Reference Number"}
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. VAT-2026-Q3-99881"
                  className="rounded-xl pr-10 border-border/60 font-mono"
                />
                <FileText className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isAr ? "تاريخ التقديم الفعلي (إن وُجد)" : "Actual Filed Date"}
              </Label>
              <Input
                type="date"
                value={filedDate}
                onChange={(e) => setFiledDate(e.target.value)}
                className="rounded-xl border-border/60"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{isAr ? "ملاحظات وتفاصيل إضافية" : "Notes"}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isAr ? "أي ملاحظات أو مستندات مرفقة أو أسباب تأخير..." : "Additional notes or attachments..."}
              rows={2}
              className="rounded-xl border-border/60 text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-border/60"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/25 font-semibold px-6"
            >
              {saving
                ? isAr
                  ? "جاري الحفظ..."
                  : "Saving..."
                : taxReturn
                ? isAr
                  ? "تحديث الإقرار"
                  : "Update Return"
                : isAr
                ? "تسجيل الإقرار"
                : "Save Return"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

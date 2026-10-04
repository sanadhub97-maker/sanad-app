import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Edit,
  Landmark,
  Percent,
  Plus,
  Receipt,
  RefreshCw,
  Scale,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { taxReturnsApi, type TaxReturnsStatsResponse } from "@/api/taxReturns";
import type { TaxReturn, TaxReturnKind } from "@/types/models";
import { TaxReturnDialog } from "@/pages/tax/tax-return-dialog";

export default function TaxDeclarationsPage() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [activeTab, setActiveTab] = useState<"ALL" | "VAT" | "ZAKAT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TaxReturnsStatsResponse | null>(null);
  const [returnsList, setReturnsList] = useState<TaxReturn[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<TaxReturn | null>(null);
  const [dialogKind, setDialogKind] = useState<TaxReturnKind>("VAT");
  const [dialogQuarter, setDialogQuarter] = useState<number | undefined>(undefined);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        taxReturnsApi.getStatsAndAlerts({ year: selectedYear }),
        taxReturnsApi.list({ year: selectedYear, pageSize: 50 }),
      ]);
      setStats(statsRes);
      setReturnsList(listRes.data);
    } catch (err: any) {
      console.error(err);
      toast.error(isAr ? "تعذر تحميل بيانات الإقرارات" : "Failed to load tax returns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const handleCopySadad = (sadad: string, id: string) => {
    navigator.clipboard.writeText(sadad);
    setCopiedId(id);
    toast.success(isAr ? `تم نسخ رقم سداد: ${sadad}` : `SADAD bill number copied: ${sadad}`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isAr ? "هل أنت متأكد من حذف هذا الإقرار؟" : "Are you sure you want to delete this return?")) {
      return;
    }
    try {
      await taxReturnsApi.remove(id);
      toast.success(isAr ? "تم حذف الإقرار بنجاح" : "Return deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(isAr ? "حدث خطأ أثناء الحذف" : "Failed to delete return");
    }
  };

  const handleOpenAdd = (kind: TaxReturnKind = "VAT", quarter?: number) => {
    setEditingReturn(null);
    setDialogKind(kind);
    setDialogQuarter(quarter);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: TaxReturn) => {
    setEditingReturn(item);
    setDialogKind(item.kind);
    setDialogOpen(true);
  };

  // Filtered returns
  const filteredReturns = useMemo(() => {
    return returnsList.filter((r) => {
      if (activeTab !== "ALL" && r.kind !== activeTab) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRef = r.reference?.toLowerCase().includes(q);
        const matchesSadad = r.sadadNumber?.toLowerCase().includes(q);
        const matchesNotes = r.notes?.toLowerCase().includes(q);
        if (!matchesRef && !matchesSadad && !matchesNotes) return false;
      }
      return true;
    });
  }, [returnsList, activeTab, statusFilter, searchQuery]);

  // Chart data: Quarterly breakdown
  const chartQuarterData = useMemo(() => {
    if (!stats) return [];
    return stats.quarters.map((q) => ({
      name: isAr ? q.nameAr.replace("الربع ", "Q") : `Q${q.quarter}`,
      fullName: isAr ? q.nameAr : q.nameEn,
      sales: q.totalSales,
      purchases: q.totalPurchases,
      netVat: q.netVat,
      outputVat: q.outputVat,
      inputVat: q.inputVat,
      status: q.status,
    }));
  }, [stats, isAr]);

  // Distribution chart data
  const chartPieData = useMemo(() => {
    if (!stats) return [];
    const output = stats.kpis.vatTotalOutput || 0;
    const input = stats.kpis.vatTotalInput || 0;
    const netVat = stats.kpis.vatTotalNet || 0;
    const zakat = stats.kpis.zakatTotalAmount || 0;

    return [
      { name: isAr ? "ضريبة المخرجات (المبيعات)" : "Output VAT", value: output, color: "#f59e0b" },
      { name: isAr ? "ضريبة المدخلات (المشتريات)" : "Input VAT", value: input, color: "#06b6d4" },
      { name: isAr ? "صافي الضريبة المستحقة" : "Net VAT Due", value: netVat > 0 ? netVat : 0, color: "#ef4444" },
      { name: isAr ? "الزكاة الشرعية المقدرة" : "Zakat Liability", value: zakat, color: "#10b981" },
    ].filter((d) => d.value > 0);
  }, [stats, isAr]);

  const vatAlert = stats?.quarterlyVatAlert;
  const zakatAlert = stats?.zakatAlert;

  return (
    <div className="min-h-screen space-y-8 pb-16">
      {/* Top Header Banner with Apple Glass Styling */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-gradient-to-br from-amber-500/10 via-background/60 to-purple-500/5 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Landmark className="h-3.5 w-3.5" />
                {isAr ? "هيئة الزكاة والضريبة والجمارك (ZATCA)" : "Zakat, Tax & Customs Authority (ZATCA)"}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <Sparkles className="h-3 w-3" />
                {isAr ? "نظام التنبيهات المباشر" : "Live Alert System"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
              {isAr ? "متابعة الإقرارات الضريبية والزكاة" : "Tax & Zakat Declarations"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {isAr
                ? "متابعة الفترات الربع سنوية لضريبة القيمة المضافة والإقرار السنوي للزكاة الشرعية مع نظام التنبيهات والعد التنازلي والرسوم البيانية التفاعلية"
                : "Real-time tracking of quarterly VAT returns and annual Zakat declarations with alert countdowns and animated interactive charts"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Fiscal Year Switcher */}
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-32 rounded-2xl border-white/20 dark:border-white/10 bg-background/60 backdrop-blur-xl shadow-sm h-11 font-semibold">
                <SelectValue placeholder={selectedYear} />
              </SelectTrigger>
              <SelectContent>
                {[2027, 2026, 2025, 2024, 2023].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {isAr ? `عام ${y}` : `Year ${y}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={fetchData}
              disabled={loading}
              className="rounded-2xl h-11 w-11 border-white/20 dark:border-white/10 bg-background/60 backdrop-blur-xl shadow-sm hover:bg-muted/60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

            {/* Add Return Button */}
            <Button
              onClick={() => handleOpenAdd("VAT")}
              className="rounded-2xl h-11 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30 font-semibold gap-2 transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? "تسجيل إقرار جديد" : "Record Declaration"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* TOP DUAL ALERTS: Quarterly VAT + Annual Zakat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Quarterly VAT Alert Card */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-background/70 to-amber-500/5 backdrop-blur-2xl p-6 sm:p-7 shadow-xl shadow-amber-500/5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-inner">
                <Bell className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {isAr ? "نظام التنبيهات الربع سنوية" : "Quarterly VAT Alert"}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">
                  {vatAlert ? vatAlert.nameAr : isAr ? "إقرار ضريبة القيمة المضافة" : "VAT Return"}
                </h3>
              </div>
            </div>

            {/* Status Badge */}
            {vatAlert && (
              <Badge
                className={`rounded-xl px-3 py-1 text-xs font-bold ${
                  vatAlert.status === "PAID"
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : vatAlert.status === "FILED"
                    ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30"
                    : vatAlert.isOverdue
                    ? "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30 animate-pulse"
                    : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
                }`}
              >
                {vatAlert.status === "PAID"
                  ? isAr ? "تم السداد" : "Paid"
                  : vatAlert.status === "FILED"
                  ? isAr ? "تم التقديم" : "Filed"
                  : vatAlert.isOverdue
                  ? isAr ? "متأخر!" : "Overdue!"
                  : isAr ? "مطلوب التقديم" : "Filing Required"}
              </Badge>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Countdown Badge */}
            <div className="p-4 rounded-2xl bg-background/50 border border-white/20 dark:border-white/10 backdrop-blur-xl">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium mb-1">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>{isAr ? "العد التنازلي للموعد النهائي" : "Deadline Countdown"}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl sm:text-4xl font-black ${
                    vatAlert?.isOverdue
                      ? "text-red-600 dark:text-red-400"
                      : vatAlert && vatAlert.daysRemaining <= 15
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-foreground"
                  }`}
                >
                  {vatAlert ? Math.abs(vatAlert.daysRemaining) : 0}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">
                  {vatAlert?.isOverdue
                    ? isAr ? "يوماً تأخير عن الموعد" : "days overdue"
                    : isAr ? "يوماً متبقية" : "days remaining"}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{isAr ? "تاريخ الاستحقاق:" : "Due date:"} {vatAlert?.dueDate}</span>
              </div>
            </div>

            {/* Quick Action Box */}
            <div className="space-y-2">
              <Button
                onClick={() => handleOpenAdd("VAT", vatAlert?.quarter)}
                className="w-full rounded-2xl h-11 bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-md shadow-amber-500/20 gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>
                  {vatAlert?.status === "PAID"
                    ? isAr ? "تعديل بيانات الربع" : "Update Quarter"
                    : isAr ? "تسجيل مبالغ الإقرار الآن" : "Record Quarter VAT"}
                </span>
              </Button>
              <div className="text-center text-[11px] text-muted-foreground">
                {isAr
                  ? "يجب تقديم الإقرار وسداد الضريبة قبل نهاية الشهر التالي للربع"
                  : "Due by the last day of the month following the quarter"}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Annual Zakat Alert Card */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-background/70 to-emerald-500/5 backdrop-blur-2xl p-6 sm:p-7 shadow-xl shadow-emerald-500/5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-inner">
                <Scale className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {isAr ? "نظام التنبيه السنوي للزكاة" : "Annual Zakat Alert"}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">
                  {isAr ? `إقرار الزكاة الشرعية لعام ${selectedYear}` : `Fiscal Year ${selectedYear} Zakat`}
                </h3>
              </div>
            </div>

            {/* Status Badge */}
            {zakatAlert && (
              <Badge
                className={`rounded-xl px-3 py-1 text-xs font-bold ${
                  zakatAlert.status === "PAID"
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : zakatAlert.status === "FILED"
                    ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30"
                    : zakatAlert.isOverdue
                    ? "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30"
                    : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                }`}
              >
                {zakatAlert.status === "PAID"
                  ? isAr ? "تم السداد" : "Paid"
                  : zakatAlert.status === "FILED"
                  ? isAr ? "تم التقديم" : "Filed"
                  : isAr ? "تنبيه سنوي نشط" : "Active Annual Alert"}
              </Badge>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Countdown Badge */}
            <div className="p-4 rounded-2xl bg-background/50 border border-white/20 dark:border-white/10 backdrop-blur-xl">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium mb-1">
                <Clock className="h-3.5 w-3.5 text-emerald-500" />
                <span>{isAr ? "موعد الإقرار الزكوي السنوي" : "Annual Zakat Deadline"}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                  {zakatAlert ? Math.abs(zakatAlert.daysRemaining) : 0}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">
                  {zakatAlert && zakatAlert.daysRemaining < 0
                    ? isAr ? "يوماً مضت" : "days past"
                    : isAr ? "يوماً متبقية" : "days remaining"}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{isAr ? "الموعد النهائي:" : "Deadline:"} {zakatAlert?.dueDate}</span>
              </div>
            </div>

            {/* Quick Action Box */}
            <div className="space-y-2">
              <Button
                onClick={() => handleOpenAdd("ZAKAT")}
                className="w-full rounded-2xl h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-500/20 gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>
                  {zakatAlert?.hasRecord
                    ? isAr ? "تعديل الوعاء والزكاة" : "Update Zakat Return"
                    : isAr ? "تسجيل وعاء الزكاة السنوي" : "Record Annual Zakat"}
                </span>
              </Button>
              <div className="text-center text-[11px] text-muted-foreground">
                {isAr
                  ? "يستحق تقديم إقرار الزكاة خلال 120 يوماً من نهاية السنة المالية"
                  : "Due within 120 days after the end of the fiscal year"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI METRIC STRIP */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Sales */}
          <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-background/50 backdrop-blur-xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold">{isAr ? "إجمالي المبيعات الخاضعة" : "Total Declared Sales"}</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground">
              {stats.kpis.vatTotalSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal text-muted-foreground mr-1">SAR</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {isAr ? "عبر جميع الفترات الربع سنوية" : "Across all quarters"}
            </div>
          </div>

          {/* Total Purchases */}
          <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-background/50 backdrop-blur-xl p-5 shadow-lg relative overflow-hidden group hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold">{isAr ? "إجمالي المشتريات والمدخلات" : "Total Declared Purchases"}</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground">
              {stats.kpis.vatTotalPurchases.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal text-muted-foreground mr-1">SAR</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {isAr ? "المشتريات الخاضعة لـ 15%" : "15% eligible purchases"}
            </div>
          </div>

          {/* Net VAT Due */}
          <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-background/50 backdrop-blur-xl p-5 shadow-lg relative overflow-hidden group hover:border-rose-500/30 transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold">{isAr ? "صافي ضريبة القيمة المضافة" : "Net VAT Payable"}</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground">
              {stats.kpis.vatTotalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal text-muted-foreground mr-1">SAR</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {isAr ? "المستحق سداده لهيئة ZATCA" : "Net amount payable to ZATCA"}
            </div>
          </div>

          {/* Zakat Liability */}
          <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-background/50 backdrop-blur-xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold">{isAr ? "إجمالي الزكاة الشرعية (2.5%)" : "Total Zakat Liability"}</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Scale className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground">
              {stats.kpis.zakatTotalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal text-muted-foreground mr-1">SAR</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {isAr
                ? `من وعاء قدره ${stats.kpis.zakatTotalBase.toLocaleString()} SAR`
                : `From base: ${stats.kpis.zakatTotalBase.toLocaleString()} SAR`}
            </div>
          </div>
        </div>
      )}

      {/* ANIMATED INTERACTIVE CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Quarterly Performance & Flow (Area & Bar) */}
        <div className="lg:col-span-2 rounded-3xl border border-white/20 dark:border-white/10 bg-background/50 backdrop-blur-xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-bold text-foreground">
                  {isAr ? "المسار المالي للأرباع السنوية (ضريبة القيمة المضافة)" : "Quarterly VAT Financial Trend"}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "مقارنة المبيعات والمشتريات وصافي الضريبة المستحقة عبر الأرباع الأربعة"
                  : "Quarterly comparison of Sales, Purchases, and Net Tax across Q1 - Q4"}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {isAr ? "المبيعات" : "Sales"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                {isAr ? "المشتريات" : "Purchases"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                {isAr ? "صافي الضريبة" : "Net VAT"}
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartQuarterData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    backdropFilter: "blur(16px)",
                    borderRadius: "1rem",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(val: any, name: string) => [
                    `${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR`,
                    name === "sales"
                      ? isAr ? "المبيعات" : "Sales"
                      : name === "purchases"
                      ? isAr ? "المشتريات" : "Purchases"
                      : isAr ? "صافي الضريبة" : "Net VAT",
                  ]}
                  labelFormatter={(label) => `${label} - ${isAr ? "البيانات المالية" : "Financials"}`}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
                <Area
                  type="monotone"
                  dataKey="purchases"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPurchases)"
                />
                <Area
                  type="monotone"
                  dataKey="netVat"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorNet)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Chart: VAT & Zakat Distribution Pie */}
        <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-background/50 backdrop-blur-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Scale className="h-5 w-5 text-emerald-500" />
              <h3 className="text-lg font-bold text-foreground">
                {isAr ? "هيكل الضرائب والزكاة" : "Tax & Zakat Distribution"}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {isAr ? "نسبة التوزيع بين المخرجات والمدخلات والزكاة" : "Proportional breakdown for selected year"}
            </p>

            <div className="h-52 w-full flex items-center justify-center">
              {chartPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        backdropFilter: "blur(16px)",
                        borderRadius: "0.75rem",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#fff",
                        fontSize: "11px",
                      }}
                      formatter={(val: any) => [`${Number(val).toLocaleString()} SAR`]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-xs text-muted-foreground p-6">
                  {isAr ? "لا توجد مبالغ مسجلة للعرض بعد" : "No declaration data recorded yet"}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
            {chartPieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-foreground">{item.value.toLocaleString()} SAR</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QUARTERS PROGRESS CARDS (Q1, Q2, Q3, Q4) */}
      {stats && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              <span>{isAr ? "متابعة أرباع السنة الضريبية" : "Quarterly VAT Milestones"}</span>
            </h3>
            <span className="text-xs text-muted-foreground">
              {isAr ? `السنة المالية ${selectedYear}` : `Fiscal Year ${selectedYear}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.quarters.map((q) => {
              const isOverdue = q.daysRemaining < 0 && q.status !== "PAID";
              const isPaid = q.status === "PAID";
              const isFiled = q.status === "FILED";

              return (
                <div
                  key={q.quarter}
                  className={`rounded-3xl border p-5 transition-all duration-200 relative overflow-hidden backdrop-blur-xl ${
                    isPaid
                      ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
                      : isOverdue
                      ? "border-red-500/40 bg-red-500/5 hover:border-red-500/60"
                      : "border-white/20 dark:border-white/10 bg-background/50 hover:border-amber-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-foreground">{q.nameAr}</span>
                    <Badge
                      className={`text-[10px] rounded-lg px-2 py-0.5 ${
                        isPaid
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : isFiled
                          ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30"
                          : isOverdue
                          ? "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30 font-bold"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isPaid
                        ? isAr ? "مسدد" : "Paid"
                        : isFiled
                        ? isAr ? "مقدم" : "Filed"
                        : isOverdue
                        ? isAr ? "متأخر" : "Overdue"
                        : isAr ? "غير مقدم" : "Not Filed"}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs mb-4">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{isAr ? "الاستحقاق:" : "Due:"}</span>
                      <span className="font-semibold text-foreground">{q.dueDate}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{isAr ? "المبيعات:" : "Sales:"}</span>
                      <span className="font-semibold text-foreground">{q.totalSales.toLocaleString()} SAR</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{isAr ? "صافي الضريبة:" : "Net VAT:"}</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {q.netVat.toLocaleString()} SAR
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {isPaid
                        ? isAr ? "تم إتمام السداد" : "Fully cleared"
                        : isOverdue
                        ? isAr ? `متأخر بـ ${Math.abs(q.daysRemaining)} يوماً` : `${Math.abs(q.daysRemaining)}d overdue`
                        : isAr ? `باقي ${q.daysRemaining} يوماً` : `${q.daysRemaining}d remaining`}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenAdd("VAT", q.quarter)}
                      className="h-7 text-xs px-2.5 rounded-xl hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                    >
                      {q.hasRecord ? (isAr ? "تعديل" : "Edit") : (isAr ? "تسجيل" : "Record")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DECLARATIONS TABLE & LIST WITH TABS */}
      <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-background/50 backdrop-blur-xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full md:w-auto">
            <TabsList className="rounded-2xl p-1 bg-muted/50 border border-white/20 dark:border-white/10">
              <TabsTrigger value="ALL" className="rounded-xl text-xs font-semibold px-4">
                {isAr ? "جميع الإقرارات" : "All Returns"}
              </TabsTrigger>
              <TabsTrigger value="VAT" className="rounded-xl text-xs font-semibold px-4 gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-amber-500" />
                <span>{isAr ? "ضريبة القيمة المضافة (VAT)" : "VAT (Quarterly)"}</span>
              </TabsTrigger>
              <TabsTrigger value="ZAKAT" className="rounded-xl text-xs font-semibold px-4 gap-1.5">
                <Scale className="h-3.5 w-3.5 text-emerald-500" />
                <span>{isAr ? "إقرارات الزكاة (Zakat)" : "Zakat (Annual)"}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search & Filter */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={isAr ? "بحث برقم سداد أو المرجع..." : "Search SADAD or reference..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-2xl pr-9 h-10 border-border/60 text-xs"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 rounded-2xl border-border/60 h-10 text-xs">
                <SelectValue placeholder={isAr ? "الحالة: الكل" : "Status: All"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{isAr ? "جميع الحالات" : "All Statuses"}</SelectItem>
                <SelectItem value="DRAFT">{isAr ? "مسودة" : "Draft"}</SelectItem>
                <SelectItem value="FILED">{isAr ? "تم التقديم" : "Filed"}</SelectItem>
                <SelectItem value="PAID">{isAr ? "تم السداد" : "Paid"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Declarations List Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/20 dark:border-white/10">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border/40 text-muted-foreground font-semibold">
                <th className="py-3.5 px-4 text-start">{isAr ? "نوع الإقرار والفترة" : "Type & Period"}</th>
                <th className="py-3.5 px-4 text-start">{isAr ? "تاريخ الاستحقاق" : "Due Date"}</th>
                <th className="py-3.5 px-4 text-start">{isAr ? "المبيعات / الوعاء" : "Sales / Base"}</th>
                <th className="py-3.5 px-4 text-start">{isAr ? "المبلغ المستحق (SAR)" : "Amount Due"}</th>
                <th className="py-3.5 px-4 text-start">{isAr ? "فاتورة سداد / المرجع" : "SADAD / Ref"}</th>
                <th className="py-3.5 px-4 text-start">{isAr ? "الحالة" : "Status"}</th>
                <th className="py-3.5 px-4 text-end">{isAr ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Landmark className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <div>{isAr ? "لا توجد إقرارات مسجلة مطابقة للبحث" : "No tax returns found"}</div>
                  </td>
                </tr>
              ) : (
                filteredReturns.map((r) => {
                  const isVat = r.kind === "VAT";
                  const isPaid = r.status === "PAID";
                  const isOverdue = r.daysRemaining !== undefined && r.daysRemaining < 0 && !isPaid;

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-muted/30 transition-colors duration-150 group"
                    >
                      {/* Kind and Period */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl ${
                              isVat ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                            }`}
                          >
                            {isVat ? <Receipt className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-foreground">
                              {isVat
                                ? isAr ? `ضريبة القيمة المضافة - الربع ${r.quarter}` : `VAT Q${r.quarter}`
                                : isAr ? `إقرار الزكاة السنوي` : `Annual Zakat`}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {isAr ? `عام ${r.year}` : `Year ${r.year}`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {r.ownerName && `${isAr ? "المالك" : "Owner"}: ${r.ownerName}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Due Date & Countdown */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{r.dueDate}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {isPaid ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {isAr ? "تم إتمام السداد" : "Cleared"}
                            </span>
                          ) : isOverdue ? (
                            <span className="text-red-500 font-bold">
                              {isAr ? `متأخر بـ ${Math.abs(r.daysRemaining || 0)} يوماً` : `${Math.abs(r.daysRemaining || 0)}d overdue`}
                            </span>
                          ) : (
                            <span>{isAr ? `باقي ${r.daysRemaining} يوماً` : `${r.daysRemaining}d remaining`}</span>
                          )}
                        </div>
                      </td>

                      {/* Base / Sales */}
                      <td className="py-3.5 px-4 font-mono font-medium">
                        {isVat
                          ? `${r.salesStandard.toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR`
                          : r.zakatBase
                          ? `${r.zakatBase.toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR`
                          : "-"}
                      </td>

                      {/* Amount Due */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-sm text-foreground font-mono">
                          {r.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR
                        </div>
                        {isVat && (
                          <div className="text-[10px] text-muted-foreground">
                            {isAr ? `مخرجات: ${r.outputVat.toLocaleString()} | مدخلات: ${r.inputVat.toLocaleString()}` : `Out: ${r.outputVat} | In: ${r.inputVat}`}
                          </div>
                        )}
                      </td>

                      {/* SADAD / Ref */}
                      <td className="py-3.5 px-4">
                        {r.sadadNumber ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-lg border border-border/40">
                              {r.sadadNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopySadad(r.sadadNumber!, r.id)}
                              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                              title={isAr ? "نسخ رقم سداد" : "Copy SADAD"}
                            >
                              {copiedId === r.id ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {r.reference && (
                          <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">
                            {r.reference}
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <Badge
                          className={`rounded-xl px-2.5 py-0.5 text-xs font-semibold ${
                            r.status === "PAID"
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : r.status === "FILED"
                              ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30"
                              : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {r.status === "PAID"
                            ? isAr ? "تم السداد" : "Paid"
                            : r.status === "FILED"
                            ? isAr ? "تم التقديم" : "Filed"
                            : isAr ? "مسودة" : "Draft"}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-end">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEdit(r)}
                            className="h-8 w-8 rounded-xl hover:bg-muted"
                            title={isAr ? "تعديل" : "Edit"}
                          >
                            <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(r.id)}
                            className="h-8 w-8 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                            title={isAr ? "حذف" : "Delete"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <TaxReturnDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        taxReturn={editingReturn}
        defaultKind={dialogKind}
        defaultYear={selectedYear}
        defaultQuarter={dialogQuarter}
        onSaved={fetchData}
      />
    </div>
  );
}

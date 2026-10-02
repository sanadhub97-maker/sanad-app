import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  FileText,
  AlertTriangle,
  Clock,
  Bell,
  Search,
  Smartphone,
  Tablet,
  Monitor,
  Moon,
  Sun,
  Sparkles,
  Send,
  Building2,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  ArrowUpRight,
  RefreshCw,
  Eye,
  Layers,
  Zap,
  Download,
  Laptop,
  SquarePlus,
  Share,
  CheckCircle2,
  WifiOff,
  Maximize2,
} from "lucide-react";
import { AppleIcon } from "@/components/common/apple-icon";
import { SaudiAvatar } from "@/components/avatars/saudi-avatar";
import { openInstall } from "@/components/lulu/lulu-install";

export default function AppleDesignPreviewPage() {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [theme, setTheme] = useState<"dark" | "light" | "aurora">("dark");
  const [glow, setGlow] = useState<"high" | "subtle" | "off">("high");
  const [activeTab, setActiveTab] = useState<"dashboard" | "employees" | "documents" | "whatsapp" | "install">("dashboard");
  const [isDynamicIslandExpanded, setIsDynamicIslandExpanded] = useState(false);
  const [dispatchMode, setDispatchMode] = useState<"text_only" | "card_only" | "both">("both");
  const [currentTime, setCurrentTime] = useState("09:41 ص");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const bgClass =
    theme === "dark"
      ? "bg-[#0A0D12] text-slate-100"
      : theme === "aurora"
      ? "bg-[#060814] text-slate-100"
      : "bg-[#F5F7FA] text-slate-900";

  const glassCard =
    theme === "light"
      ? "bg-white/80 border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl"
      : theme === "aurora"
      ? "bg-[#0F1428]/70 border-white/[0.12] shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl"
      : "bg-[#131924]/75 border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl";

  const glassSubtle =
    theme === "light"
      ? "bg-slate-100/70 border-slate-200/60"
      : "bg-white/[0.04] border-white/[0.06]";

  const glowShadow =
    glow === "off"
      ? ""
      : glow === "subtle"
      ? "hover:shadow-[0_0_25px_-5px_rgba(14,165,233,0.25)]"
      : "hover:shadow-[0_0_35px_-2px_rgba(59,130,246,0.4)] transition-all duration-300";

  const metricGridClass =
    device === "mobile"
      ? "grid grid-cols-1 gap-3"
      : device === "tablet"
      ? "grid grid-cols-2 gap-4"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4";

  const splitGridClass =
    device === "mobile"
      ? "flex flex-col gap-4"
      : device === "tablet"
      ? "flex flex-col gap-5"
      : "grid grid-cols-1 lg:grid-cols-3 gap-6";

  const employeeGridClass =
    device === "mobile"
      ? "grid grid-cols-1 gap-3"
      : device === "tablet"
      ? "grid grid-cols-2 gap-4"
      : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";

  return (
    <div className={`min-h-screen ${bgClass} font-sans relative selection:bg-blue-500/30 overflow-x-hidden antialiased`} dir="rtl">
      {/* Dynamic Background Glowing Orbs (Aurora effect) */}
      {glow !== "off" && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div
            className={`absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[140px] opacity-40 transition-all duration-1000 ${
              theme === "aurora"
                ? "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500"
                : theme === "dark"
                ? "bg-gradient-to-br from-blue-600/40 via-cyan-500/30 to-emerald-500/20"
                : "bg-gradient-to-br from-blue-300/60 via-sky-200/50 to-indigo-200/40"
            }`}
          />
          <div
            className={`absolute top-1/2 -left-48 w-[550px] h-[550px] rounded-full blur-[150px] opacity-30 transition-all duration-1000 ${
              theme === "aurora"
                ? "bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-700"
                : theme === "dark"
                ? "bg-gradient-to-tr from-indigo-700/30 via-purple-600/20 to-pink-600/20"
                : "bg-gradient-to-tr from-emerald-200/50 via-teal-200/40 to-blue-200/40"
            }`}
          />
          <div
            className={`absolute -bottom-40 right-1/4 w-[500px] h-[500px] rounded-full blur-[160px] opacity-25 ${
              theme === "aurora" ? "bg-emerald-500" : "bg-blue-600"
            }`}
          />
        </div>
      )}

      {/* Floating Apple-Style Control Toolbar (Fixed at Top) */}
      <header className="sticky top-4 z-50 px-4 max-w-7xl mx-auto">
        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-[#161D2C]/80 backdrop-blur-2xl p-2.5 shadow-[0_10px_35px_rgba(0,0,0,0.15)] flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3 pr-2">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-700 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]">
              <Sparkles className="w-5 h-5 text-blue-100 animate-pulse" />
              <div className="absolute inset-0 rounded-xl border border-white/30" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-l from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                  SanaD HR
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  Apple Experience
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">
                معاينة التصميم الزجاجي الفاخر مع المؤثرات والتوهج
              </p>
            </div>
          </div>

          {/* Interactive Device Viewport Controls */}
          <div className="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5 gap-1">
            <button
              onClick={() => setDevice("desktop")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                device === "desktop"
                  ? "bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>كمبيوتر</span>
            </button>
            <button
              onClick={() => setDevice("tablet")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                device === "tablet"
                  ? "bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>تابلت (iPad)</span>
            </button>
            <button
              onClick={() => setDevice("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                device === "mobile"
                  ? "bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>هاتف (iPhone)</span>
            </button>
          </div>

          {/* Theme & Glow Toggles */}
          <div className="flex items-center gap-2">
            {/* Theme Selector */}
            <div className="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5 gap-1">
              <button
                onClick={() => setTheme("dark")}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  theme === "dark" ? "bg-white dark:bg-slate-700 text-blue-400 shadow-sm" : "text-muted-foreground"
                }`}
                title="تيتانيوم أسود (Space Black)"
              >
                <Moon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme("aurora")}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  theme === "aurora" ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm" : "text-muted-foreground"
                }`}
                title="أورورا نيون (Cosmic Glow)"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme("light")}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  theme === "light" ? "bg-white text-amber-500 shadow-sm" : "text-muted-foreground"
                }`}
                title="زجاجي أبيض نقي (Pure Light)"
              >
                <Sun className="w-4 h-4" />
              </button>
            </div>

            {/* Glow Intensity */}
            <button
              onClick={() => setGlow(glow === "high" ? "subtle" : glow === "subtle" ? "off" : "high")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                glow === "high"
                  ? "bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  : glow === "subtle"
                  ? "bg-slate-500/10 border-slate-500/20 text-slate-400"
                  : "bg-transparent border-transparent text-muted-foreground opacity-60"
              }`}
              title="التحكم في قوة التوهج والإضاءة"
            >
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>{glow === "high" ? "توهج فائق" : glow === "subtle" ? "توهج هادئ" : "بدون توهج"}</span>
            </button>

            {/* Link back to Main App */}
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/15 transition-all"
            >
              <span>العودة للنظام</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Interactive Stage Container */}
      <main className="relative z-10 py-8 px-4 max-w-7xl mx-auto flex flex-col items-center">
        {/* Device Frame Wrapper */}
        <div
          className={`w-full transition-all duration-500 ease-out flex justify-center ${
            device === "mobile"
              ? "max-w-[420px]"
              : device === "tablet"
              ? "max-w-[860px]"
              : "max-w-7xl"
          }`}
        >
          {/* Apple Device Outer Chassis */}
          <div
            className={`w-full relative transition-all duration-500 ${
              device === "mobile"
                ? "rounded-[52px] border-[10px] border-[#2A2E39] shadow-[0_25px_70px_rgba(0,0,0,0.6)] bg-black p-3"
                : device === "tablet"
                ? "rounded-[42px] border-[14px] border-[#242833] shadow-[0_30px_90px_rgba(0,0,0,0.5)] bg-black p-4"
                : "rounded-3xl border border-white/20 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden"
            }`}
          >
            {/* iPhone / iPad Hardware Features */}
            {device === "mobile" && (
              <>
                {/* iPhone Dynamic Island */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40">
                  <div
                    onClick={() => setIsDynamicIslandExpanded(!isDynamicIslandExpanded)}
                    className={`bg-black text-white rounded-full transition-all duration-300 cursor-pointer flex items-center justify-between px-3 border border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.8)] ${
                      isDynamicIslandExpanded ? "w-[280px] h-[72px] rounded-3xl p-3" : "w-[125px] h-[32px]"
                    }`}
                  >
                    {!isDynamicIslandExpanded ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">نشط</span>
                        </div>
                        <div className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700" />
                        <span className="text-[10px] font-mono font-bold text-slate-300">سند</span>
                      </>
                    ) : (
                      <div className="w-full flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center">
                            <Send className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-white">إرسال الواتساب اليومي</div>
                            <div className="text-[10px] text-slate-400">مجدول عند 09:00 ص بتوقيت الرياض</div>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                          جاهز
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* iPhone Status Bar */}
                <div className="flex items-center justify-between px-6 pt-2 pb-6 text-xs font-bold text-slate-300 select-none">
                  <span>{currentTime}</span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span>5G</span>
                    <div className="w-5 h-2.5 rounded-sm border border-slate-300 p-0.5 flex items-center">
                      <div className="w-3 h-1.5 rounded-[1px] bg-slate-300" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Desktop Top Window Header (Safari Style) */}
            {device === "desktop" && (
              <div className="border-b border-white/10 dark:border-white/5 bg-white/40 dark:bg-white/[0.03] backdrop-blur-md px-4 py-3 flex items-center justify-between gap-4">
                {/* Window Traffic Lights */}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                  <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                </div>

                {/* Safari Search Bar Pill */}
                <div className="flex-1 max-w-md mx-auto">
                  <div className="rounded-xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-black/30 backdrop-blur-md px-3.5 py-1.5 flex items-center justify-between text-xs text-muted-foreground shadow-sm">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        sanad.hr/executive-dashboard
                      </span>
                    </div>
                    <RefreshCw className="w-3 h-3 opacity-60" />
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-emerald-500 font-mono text-[11px]">مُتصل بنجاح</span>
                </div>
              </div>
            )}

            {/* Inner Content Surface (The actual Apple-style UI) */}
            <div
              className={`relative overflow-hidden transition-all duration-300 ${
                device === "mobile"
                  ? "rounded-[38px] min-h-[760px] p-3 pt-2 bg-gradient-to-b from-[#0D121D] to-[#0A0D14]"
                  : device === "tablet"
                  ? "rounded-[28px] min-h-[820px] p-5 bg-gradient-to-b from-[#0E1320] to-[#0A0D15]"
                  : "min-h-[740px] p-6 lg:p-8 bg-gradient-to-b from-white/10 to-transparent"
              }`}
            >
              {/* Internal Top Navigation & Search Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight bg-gradient-to-l from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                      منظومة سند المتقدمة
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      إصدار الزجاج الفاخر
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    إدارة شاملة للكوادر البشرية والوثائق الحكومية والتنبيهات المجدولة
                  </p>
                </div>

                {/* Action Search & User Profile */}
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="بحث سريع (موظف، إقامة، فرع)..."
                      className="pr-9 pl-4 py-2 rounded-xl text-xs bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-xl w-48 sm:w-64 transition-all"
                    />
                  </div>
                  <button className="relative p-2 rounded-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:bg-white/20 transition-all">
                    <Bell className="w-4 h-4 text-slate-300" />
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-background" />
                  </button>
                  <div className="flex items-center gap-2 pr-1">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-sm">
                      <div className="w-full h-full rounded-[10px] bg-slate-900 flex items-center justify-center text-xs font-bold text-amber-300">
                        س
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Apple Segmented Control Tabs */}
              <div className="flex items-center justify-start overflow-x-auto pb-2 mb-6 scrollbar-none">
                <div className="flex items-center bg-black/10 dark:bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-xl gap-1">
                  <button
                    onClick={() => setActiveTab("dashboard")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                      activeTab === "dashboard"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>المؤشرات العامة</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("employees")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                      activeTab === "employees"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>الموظفون والكوادر</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("documents")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                      activeTab === "documents"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>الوثائق والتراخيص</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("whatsapp")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                      activeTab === "whatsapp"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>إرسال وتنبيهات الواتساب</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("install")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                      activeTab === "install"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>إشعار التثبيت الذكي (PWA)</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: EXECUTIVE DASHBOARD */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  {/* Hero Metric Cards Grid (Apple Squircle Style with Glow) */}
                  <div className={metricGridClass}>
                    {/* Card 1: Total Employees */}
                    <div
                      className={`relative rounded-3xl p-5 border ${glassCard} ${glowShadow} group overflow-hidden`}
                    >
                      {glow !== "off" && (
                        <div className="absolute -top-12 -left-12 w-28 h-28 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/35 transition-all duration-500" />
                      )}
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <span className="text-xs font-bold text-muted-foreground">إجمالي القوى العاملة</span>
                        <AppleIcon icon={Users} tone="blue" size="md" />
                      </div>
                      <div className="flex items-baseline gap-2 relative z-10">
                        <span className="text-3xl font-extrabold tracking-tight font-mono">148</span>
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          +12% هذا الشهر
                        </span>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-muted-foreground relative z-10">
                        <span>124 على رأس العمل</span>
                        <span className="text-blue-400 font-bold">4 فروع نشطة</span>
                      </div>
                    </div>

                    {/* Card 2: Expiring Soon Documents */}
                    <div
                      className={`relative rounded-3xl p-5 border ${glassCard} ${glowShadow} group overflow-hidden`}
                    >
                      {glow !== "off" && (
                        <div className="absolute -top-12 -left-12 w-28 h-28 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/35 transition-all duration-500" />
                      )}
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <span className="text-xs font-bold text-muted-foreground">وثائق مستحقة قريباً</span>
                        <AppleIcon icon={Clock} tone="amber" size="md" />
                      </div>
                      <div className="flex items-baseline gap-2 relative z-10">
                        <span className="text-3xl font-extrabold tracking-tight font-mono text-amber-400">18</span>
                        <span className="text-xs font-bold text-amber-400/80">خلال 30 يوماً</span>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-muted-foreground relative z-10">
                        <span>11 إقامة • 7 تراخيص</span>
                        <span className="text-amber-400 font-bold">تنبيه مجدول</span>
                      </div>
                    </div>

                    {/* Card 3: Critical Expired */}
                    <div
                      className={`relative rounded-3xl p-5 border ${glassCard} ${glowShadow} group overflow-hidden`}
                    >
                      {glow !== "off" && (
                        <div className="absolute -top-12 -left-12 w-28 h-28 bg-rose-500/20 rounded-full blur-2xl group-hover:bg-rose-500/35 transition-all duration-500" />
                      )}
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <span className="text-xs font-bold text-muted-foreground">وثائق منتهية (حرج)</span>
                        <AppleIcon icon={AlertTriangle} tone="red" size="md" />
                      </div>
                      <div className="flex items-baseline gap-2 relative z-10">
                        <span className="text-3xl font-extrabold tracking-tight font-mono text-rose-400">3</span>
                        <span className="text-xs font-bold text-rose-400/80">تحتاج تجديد فوري</span>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-muted-foreground relative z-10">
                        <span>تأمين طبي ورخصة بلدية</span>
                        <button className="text-rose-400 font-bold hover:underline">متابعة الآن</button>
                      </div>
                    </div>

                    {/* Card 4: WhatsApp Scheduled Status */}
                    <div
                      className={`relative rounded-3xl p-5 border ${glassCard} ${glowShadow} group overflow-hidden`}
                    >
                      {glow !== "off" && (
                        <div className="absolute -top-12 -left-12 w-28 h-28 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/35 transition-all duration-500" />
                      )}
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <span className="text-xs font-bold text-muted-foreground">الإرسال اليومي المجدول</span>
                        <AppleIcon icon={Send} tone="emerald" size="md" />
                      </div>
                      <div className="flex items-baseline gap-2 relative z-10">
                        <span className="text-3xl font-extrabold tracking-tight font-mono text-emerald-400">09:00 ص</span>
                        <span className="text-xs font-bold text-emerald-400/90">يومياً</span>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-muted-foreground relative z-10">
                        <span>النمط: كلاهما معاً</span>
                        <span className="text-emerald-400 font-bold">نشط وتلقائي</span>
                      </div>
                    </div>
                  </div>

                  {/* Dual Card Section: Interactive Expiring Feed & Visual Chart */}
                  <div className={splitGridClass}>
                    {/* Left: Smart Live Expiring Items Carousel */}
                    <div className={`lg:col-span-2 rounded-3xl p-6 border ${glassCard} relative overflow-hidden`}>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3B82F6]" />
                          <h2 className="text-base font-bold">الوثائق ذات الأولوية العاجلة</h2>
                        </div>
                        <span className="text-xs text-muted-foreground">تم التحديث قبل دقيقتين</span>
                      </div>

                      <div className="space-y-3">
                        {/* Item 1 */}
                        <div className={`p-4 rounded-2xl border ${glassSubtle} hover:border-amber-500/40 transition-all flex items-center justify-between gap-4 group`}>
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">إقامة: محمد أحمد الغامدي</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  متبقي 6 أيام
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                رقم الوثيقة: 2490182741 • فرع العليا الرئيسي
                              </p>
                            </div>
                          </div>
                          <button className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-all flex items-center gap-1">
                            <span>تنبيه واتساب</span>
                            <Send className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Item 2 */}
                        <div className={`p-4 rounded-2xl border ${glassSubtle} hover:border-rose-500/40 transition-all flex items-center justify-between gap-4 group`}>
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                              <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">رخصة الدفاع المدني: فرع التخصصي</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                  منتهية (أمس)
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                رقم الترخيص: CD-9921-2026 • الإدارة العامة
                              </p>
                            </div>
                          </div>
                          <button className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1">
                            <span>تجديد فوري</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Item 3 */}
                        <div className={`p-4 rounded-2xl border ${glassSubtle} hover:border-blue-500/40 transition-all flex items-center justify-between gap-4 group`}>
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">التأمين الطبي: شركة بوبا العربية</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                  متبقي 24 يوماً
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                وثيقة مجمعة تغطي 85 موظفاً وتابعاً
                              </p>
                            </div>
                          </div>
                          <button className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-300 border border-white/15 transition-all flex items-center gap-1">
                            <span>عرض الوثيقة</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: Apple Ring Chart & Status Breakdown */}
                    <div className={`rounded-3xl p-6 border ${glassCard} flex flex-col justify-between relative overflow-hidden`}>
                      {glow !== "off" && (
                        <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-blue-600/15 rounded-full blur-2xl" />
                      )}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-base font-bold">صحة وسريان الوثائق</h2>
                          <span className="text-xs font-mono font-bold text-emerald-400">92% سارية</span>
                        </div>

                        {/* Apple-like Concentric Visual Rings */}
                        <div className="relative w-44 h-44 mx-auto my-4 flex items-center justify-center">
                          {/* Outer Ring - Valid (Emerald) */}
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" className="stroke-slate-800" strokeWidth="8" fill="none" />
                            <circle
                              cx="50"
                              cy="50"
                              r="42"
                              className="stroke-emerald-400 transition-all duration-1000"
                              strokeWidth="8"
                              strokeDasharray="264"
                              strokeDashoffset="26"
                              strokeLinecap="round"
                              fill="none"
                            />
                            {/* Middle Ring - Expiring (Amber) */}
                            <circle cx="50" cy="50" r="30" className="stroke-slate-800" strokeWidth="8" fill="none" />
                            <circle
                              cx="50"
                              cy="50"
                              r="30"
                              className="stroke-amber-400 transition-all duration-1000"
                              strokeWidth="8"
                              strokeDasharray="188"
                              strokeDashoffset="140"
                              strokeLinecap="round"
                              fill="none"
                            />
                            {/* Inner Ring - Expired (Rose) */}
                            <circle cx="50" cy="50" r="18" className="stroke-slate-800" strokeWidth="8" fill="none" />
                            <circle
                              cx="50"
                              cy="50"
                              r="18"
                              className="stroke-rose-400 transition-all duration-1000"
                              strokeWidth="8"
                              strokeDasharray="113"
                              strokeDashoffset="98"
                              strokeLinecap="round"
                              fill="none"
                            />
                          </svg>

                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-2xl font-extrabold font-mono tracking-tight">169</span>
                            <span className="text-[10px] text-muted-foreground font-bold">وثيقة مسجلة</span>
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="space-y-2 mt-4 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                              <span className="text-muted-foreground">سارية المفعول</span>
                            </div>
                            <span className="font-mono font-bold">148 وثيقة</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                              <span className="text-muted-foreground">تنتهي قريباً (30 يوماً)</span>
                            </div>
                            <span className="font-mono font-bold text-amber-400">18 وثيقة</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                              <span className="text-muted-foreground">منتهية الصلاحية</span>
                            </div>
                            <span className="font-mono font-bold text-rose-400">3 وثائق</span>
                          </div>
                        </div>
                      </div>

                      <button className="w-full mt-6 py-2.5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_16px_rgba(37,99,235,0.35)] transition-all">
                        تصدير تقرير السلامة الشامل
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: EMPLOYEES & SAUDI AVATARS */}
              {activeTab === "employees" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold">بطاقات الكوادر البشرية (بالزي السعودي الفاخر)</h2>
                      <p className="text-xs text-muted-foreground">
                        أفاتارات ثلاثية الأبعاد بملامح سعودية أصيلة، شماغ وعقال وثوب أو عباءة وحجاب مع إطار التوهج
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-sm hover:bg-blue-500 transition-all">
                        + إضافة موظف جديد
                      </button>
                    </div>
                  </div>

                  <div className={employeeGridClass}>
                    {/* Employee 1: Male Executive */}
                    <div className={`rounded-3xl p-5 border ${glassCard} ${glowShadow} relative group`}>
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <SaudiAvatar
                            gender="MALE"
                            theme="sapphire"
                            size="lg"
                            showRing={true}
                            className="shadow-[0_8px_20px_rgba(0,0,0,0.3)]"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm truncate">سلمان عبد العزيز المقرن</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              ساري
                            </span>
                          </div>
                          <p className="text-xs text-blue-400 font-medium mt-0.5">مدير الموارد البشرية</p>
                          <p className="text-[11px] text-muted-foreground mt-1">الرقم الوظيفي: SND-1002</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-white/[0.04]">
                          <span className="text-[10px] text-muted-foreground block">تاريخ انتهاء الإقامة</span>
                          <span className="font-bold font-mono text-emerald-400">1448/04/15 هـ</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white/[0.04]">
                          <span className="text-[10px] text-muted-foreground block">الفرع والمدينة</span>
                          <span className="font-bold truncate block">الرياض - العليا</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-all flex items-center justify-center gap-1.5">
                          <Eye className="w-3 h-3" />
                          <span>الملف الكامل</span>
                        </button>
                        <button className="p-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all" title="إرسال واتساب">
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Employee 2: Female Executive */}
                    <div className={`rounded-3xl p-5 border ${glassCard} ${glowShadow} relative group`}>
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <SaudiAvatar
                            gender="FEMALE"
                            theme="emerald"
                            size="lg"
                            showRing={true}
                            className="shadow-[0_8px_20px_rgba(0,0,0,0.3)]"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm truncate">نورة فهد القحطاني</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              تجديد قريباً
                            </span>
                          </div>
                          <p className="text-xs text-blue-400 font-medium mt-0.5">مديرة إدارة العمليات والرواتب</p>
                          <p className="text-[11px] text-muted-foreground mt-1">الرقم الوظيفي: SND-1008</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-white/[0.04]">
                          <span className="text-[10px] text-muted-foreground block">تاريخ انتهاء الهوية</span>
                          <span className="font-bold font-mono text-amber-400">1447/12/28 هـ</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white/[0.04]">
                          <span className="text-[10px] text-muted-foreground block">الفرع والمدينة</span>
                          <span className="font-bold truncate block">جدة - الكورنيش</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-all flex items-center justify-center gap-1.5">
                          <Eye className="w-3 h-3" />
                          <span>الملف الكامل</span>
                        </button>
                        <button className="p-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all" title="إرسال واتساب">
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Employee 3: Male Engineer */}
                    <div className={`rounded-3xl p-5 border ${glassCard} ${glowShadow} relative group`}>
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <SaudiAvatar
                            gender="MALE"
                            theme="gold"
                            size="lg"
                            showRing={true}
                            className="shadow-[0_8px_20px_rgba(0,0,0,0.3)]"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm truncate">طارق خالد الدوسري</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              ساري
                            </span>
                          </div>
                          <p className="text-xs text-blue-400 font-medium mt-0.5">رئيس قسم السلامة المهنية</p>
                          <p className="text-[11px] text-muted-foreground mt-1">الرقم الوظيفي: SND-1014</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-white/[0.04]">
                          <span className="text-[10px] text-muted-foreground block">شهادة السلامة</span>
                          <span className="font-bold font-mono text-emerald-400">1448/08/10 هـ</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white/[0.04]">
                          <span className="text-[10px] text-muted-foreground block">الفرع والمدينة</span>
                          <span className="font-bold truncate block">الدمام - الشاطئ</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-all flex items-center justify-center gap-1.5">
                          <Eye className="w-3 h-3" />
                          <span>الملف الكامل</span>
                        </button>
                        <button className="p-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all" title="إرسال واتساب">
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DOCUMENTS & LICENSES */}
              {activeTab === "documents" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold">مركز الوثائق والتراخيص الرسمية</h2>
                      <p className="text-xs text-muted-foreground">
                        متابعة دقيقة لتواريخ انتهاء السجلات التجارية ورخص العمل والبلدية والدفاع المدني
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Document Box 1 */}
                    <div className={`p-5 rounded-3xl border ${glassCard} ${glowShadow}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <AppleIcon icon={Building2} tone="indigo" size="md" />
                          <div>
                            <h3 className="font-bold text-sm">السجل التجاري الرئيسي (وزارة التجارة)</h3>
                            <span className="text-xs text-muted-foreground font-mono">CR-1010884920</span>
                          </div>
                        </div>
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          ساري (14 شهر)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mt-4">
                        <div className="p-2.5 rounded-xl bg-white/[0.04]">
                          <span className="text-[10px] text-muted-foreground block">تاريخ الإصدار</span>
                          <span className="font-bold font-mono">1445/01/10 هـ</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/[0.04]">
                          <span className="text-[10px] text-muted-foreground block">تاريخ الانتهاء</span>
                          <span className="font-bold font-mono text-emerald-400">1448/01/09 هـ</span>
                        </div>
                      </div>
                    </div>

                    {/* Document Box 2 */}
                    <div className={`p-5 rounded-3xl border ${glassCard} ${glowShadow}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <AppleIcon icon={AlertTriangle} tone="amber" size="md" />
                          <div>
                            <h3 className="font-bold text-sm">رخصة بلدي (أمانة منطقة الرياض)</h3>
                            <span className="text-xs text-muted-foreground font-mono">BLD-40912</span>
                          </div>
                        </div>
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          ينتهي بعد 18 يوماً
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mt-4">
                        <div className="p-2.5 rounded-xl bg-white/[0.04]">
                          <span className="text-[10px] text-muted-foreground block">النشاط التجاري</span>
                          <span className="font-bold">خدمات تقنية وإدارية</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/[0.04]">
                          <span className="text-[10px] text-muted-foreground block">تاريخ الانتهاء</span>
                          <span className="font-bold font-mono text-amber-400">1447/10/20 هـ</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: WHATSAPP SCHEDULE & DISPATCH STUDIO */}
              {activeTab === "whatsapp" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold">إعدادات إرسال التنبيهات وجدولة الموعد اليومي</h2>
                    <p className="text-xs text-muted-foreground">
                      تحكم كامل في إرسال رسالة نصية فقط، أو بطاقة معتمدة فقط، أو كلاهما معاً وتحديد توقيت الإرسال
                    </p>
                  </div>

                  {/* Mode Selector 3 Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                      onClick={() => setDispatchMode("text_only")}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        dispatchMode === "text_only"
                          ? "bg-blue-600/15 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] text-blue-400"
                          : "bg-white/[0.04] border-white/10 hover:border-white/20 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <AppleIcon icon={MessageSquare} tone="blue" size="sm" />
                        {dispatchMode === "text_only" && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        )}
                      </div>
                      <h4 className="font-bold text-sm">رسالة نصية فقط</h4>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        إرسال القالب الملكي المنسق بالأيقونات دون صورة البطاقة.
                      </p>
                    </div>

                    <div
                      onClick={() => setDispatchMode("card_only")}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        dispatchMode === "card_only"
                          ? "bg-blue-600/15 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] text-blue-400"
                          : "bg-white/[0.04] border-white/10 hover:border-white/20 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <AppleIcon icon={FileText} tone="purple" size="sm" />
                        {dispatchMode === "card_only" && (
                          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        )}
                      </div>
                      <h4 className="font-bold text-sm">بطاقة تنبيه فقط</h4>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        إرسال صورة البطاقة المعتمدة عالية الدقة مع ترويسة موجزة.
                      </p>
                    </div>

                    <div
                      onClick={() => setDispatchMode("both")}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        dispatchMode === "both"
                          ? "bg-blue-600/15 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] text-blue-400"
                          : "bg-white/[0.04] border-white/10 hover:border-white/20 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <AppleIcon icon={Sparkles} tone="emerald" size="sm" />
                        {dispatchMode === "both" && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                      </div>
                      <h4 className="font-bold text-sm">كلاهما معاً (المثالي)</h4>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        إرسال الرسالة النصية المنسقة أولاً ثم صورة البطاقة تالياً.
                      </p>
                    </div>
                  </div>

                  {/* Scheduled Time Display Box */}
                  <div className={`p-5 rounded-3xl border ${glassCard} flex flex-col sm:flex-row items-center justify-between gap-4`}>
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm">توقيت الفحص والإرسال اليومي التلقائي</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            مجدول ونشط
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          يتم فحص الوثائق يومياً الساعة <span className="font-mono font-bold text-blue-400">09:00 ص</span> (توقيت الرياض Asia/Riyadh).
                        </p>
                      </div>
                    </div>
                    <button className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_16px_rgba(37,99,235,0.35)] transition-all flex items-center gap-1.5 whitespace-nowrap">
                      <Send className="w-3.5 h-3.5" />
                      <span>فحص وإرسال تجريبي الآن</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: SMART INSTALL NOTIFICATION SIMULATOR */}
              {activeTab === "install" && (
                <div className="space-y-6">
                  {/* Hero Intro */}
                  <div className={`rounded-3xl p-6 border ${glassCard} ${glowShadow}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            <Download className="w-5 h-5" />
                          </span>
                          <h2 className="text-xl font-bold">إشعار التثبيت الذكي الفاخر (Apple PWA Experience)</h2>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                          عند فتح الموقع، يظهر تلقائياً إشعار تثبيت زجاجي راقٍ يتكيف فورياً مع نوع الجهاز المستخدم (كمبيوتر، آيفون، آيباد، أو أندرويد) مع إرشادات التثبيت الأصلية وزر تثبيت فوري بنقرة واحدة.
                        </p>
                      </div>

                      {/* Interactive Test Triggers */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => openInstall("desktop-chrome")}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_16px_rgba(37,99,235,0.35)] flex items-center gap-1.5 transition-all"
                        >
                          <Laptop className="w-3.5 h-3.5" />
                          <span>تجربة للكمبيوتر</span>
                        </button>
                        <button
                          onClick={() => openInstall("iphone")}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_4px_16px_rgba(79,70,229,0.35)] flex items-center gap-1.5 transition-all"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>تجربة للآيفون</span>
                        </button>
                        <button
                          onClick={() => openInstall("ipad")}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_4px_16px_rgba(147,51,234,0.35)] flex items-center gap-1.5 transition-all"
                        >
                          <Tablet className="w-3.5 h-3.5" />
                          <span>تجربة للآيباد</span>
                        </button>
                        <button
                          onClick={() => openInstall("android-phone")}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_4px_16px_rgba(16,185,129,0.35)] flex items-center gap-1.5 transition-all"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>تجربة للأندرويد</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live Visual Demonstration of the Card in Light & Dark */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Dark Mode Card Presentation */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-slate-300">تصميم الزجاج الليلي (Obsidian Space Black)</span>
                        <span className="text-[11px] text-blue-400 font-mono">Mobile & Desktop Ready</span>
                      </div>

                      <div className="relative overflow-hidden rounded-[28px] p-5 bg-[#0e1628]/95 border border-white/20 shadow-[0_25px_65px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-2xl text-white">
                        {/* Glow orbs */}
                        <div className="absolute -top-10 -start-10 h-32 w-32 rounded-full bg-blue-500/30 blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-8 -end-8 h-28 w-28 rounded-full bg-indigo-500/25 blur-2xl pointer-events-none" />

                        {/* Card Header */}
                        <div className="relative flex items-start gap-3.5 mb-4">
                          <div className="relative h-14 w-14 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-br from-amber-400/40 via-blue-500/30 to-indigo-600/40 shadow-lg shrink-0">
                            <img src="/pwa/icon-192.png" alt="SanaD" className="h-full w-full object-cover rounded-[14px]" />
                            <div className="absolute -bottom-1 -end-1 h-5 w-5 rounded-full bg-[#0a1020] border border-white/30 flex items-center justify-center text-blue-400 shadow-sm">
                              <Laptop className="h-3 w-3" />
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                PWA معتمد
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[10px] text-blue-300">
                                <Sparkles className="h-2.5 w-2.5 text-blue-400" />
                                تجربة أبل
                              </span>
                            </div>
                            <h4 className="font-head text-base font-bold text-white leading-snug">
                              ثبّت SanaD على جهازك
                            </h4>
                            <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                              يعمل كبرنامج مستقل دون الحاجة لمتجر تطبيقات أو استهلاك ذاكرة
                            </p>
                          </div>
                        </div>

                        {/* Perks */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/10 p-2">
                            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/25">
                              <Zap className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white">إقلاع فوري</p>
                              <p className="text-[10px] text-slate-400">أقل من ثانية</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/10 p-2">
                            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                              <WifiOff className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white">دون إنترنت</p>
                              <p className="text-[10px] text-slate-400">تصفح مستمر</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/10 p-2">
                            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/25">
                              <Maximize2 className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white">شاشة كاملة</p>
                              <p className="text-[10px] text-slate-400">بدون متصفح</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/10 p-2">
                            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                              <Bell className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white">تنبيهات فورية</p>
                              <p className="text-[10px] text-slate-400">قبل الانتهاء</p>
                            </div>
                          </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openInstall("desktop-chrome")}
                            className="flex-1 h-10 px-4 rounded-xl font-head font-bold text-xs text-white bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 shadow-[0_4px_16px_rgba(37,99,235,0.4)] flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all"
                          >
                            <Download className="h-3.5 w-3.5 animate-bounce" />
                            <span>تثبيت الآن بنقرة واحدة</span>
                          </button>
                          <button
                            onClick={() => openInstall("desktop-chrome")}
                            className="h-10 px-3.5 rounded-xl font-medium text-xs text-slate-300 bg-white/10 hover:bg-white/15 border border-white/10 transition-all"
                          >
                            تذكيري لاحقاً
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Step Guide Preview for iPhone / iPad */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-slate-300">إرشادات أبل التلقائية (iOS / iPadOS)</span>
                        <span className="text-[11px] text-emerald-400 font-mono">Safari Native Flow</span>
                      </div>

                      <div className="relative overflow-hidden rounded-[28px] p-5 bg-[#0e1628]/95 border border-white/20 shadow-[0_25px_65px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-2xl text-white">
                        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2.5">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-blue-400" />
                            <span className="font-bold text-xs text-white">خطوات التثبيت السلسة على الآيفون والآيباد</span>
                          </div>
                          <span className="text-[10px] text-slate-400">3 خطوات سهلة</span>
                        </div>

                        <div className="space-y-2.5 mb-4 text-xs text-slate-200">
                          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-500/20 text-blue-400 text-[11px] font-bold">1</span>
                            <span>انقر على زر المشاركة <span className="inline-flex items-center gap-1 rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-300 font-semibold"><Share className="h-3 w-3" /></span> في أسفل شاشة سفاري</span>
                          </div>

                          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-500/20 text-blue-400 text-[11px] font-bold">2</span>
                            <span>اختر <span className="inline-flex items-center gap-1 rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-300 font-semibold"><SquarePlus className="h-3 w-3" /> إضافة إلى الشاشة الرئيسية</span></span>
                          </div>

                          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-500/20 text-blue-400 text-[11px] font-bold">3</span>
                            <span>اضغط على «إضافة» (Add) في الزاوية العلوية ليظهر كتطبيق فوري</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span>لا يتطلب متجر برامج ولا حساب مطور</span>
                          </span>
                          <button
                            onClick={() => openInstall("iphone")}
                            className="text-blue-400 hover:text-blue-300 font-bold underline"
                          >
                            عرض الإشعار الحي الآن
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Compatibility & Platform Highlights */}
                  <div className={`rounded-3xl p-5 border ${glassCard} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`}>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                        <Laptop className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold">الكمبيوتر الشخصي</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          تثبيت كبرنامج مكتبي مستقل عبر Chrome أو Edge مع تشغيل مباشر من شريط المهام.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold">أجهزة الآيفون (iOS)</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          إضافة سريعة للشاشة الرئيسية مع دعم كامل لتجربة الشاشة الكاملة وإشعارات سفاري.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                        <Tablet className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold">أجهزة الآيباد والتابلت</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          مساحة عمل لوحية واسعة تعمل بملء الشاشة مع استجابة تامة للمس واللوحة الجانبية.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold">أجهزة الأندرويد</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          تثبيت فوري بنقرة واحدة عبر متصفح كروم مع دعم العمل دون اتصال وتحديثات تلقائية.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Floating Apple Dock (Active on Mobile and Tablet) */}
              {(device === "mobile" || device === "tablet") && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-fit">
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-3xl bg-black/70 border border-white/20 backdrop-blur-2xl shadow-[0_15px_35px_rgba(0,0,0,0.6)]">
                    <button
                      onClick={() => setActiveTab("dashboard")}
                      className={`p-2 rounded-2xl transition-all ${
                        activeTab === "dashboard" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveTab("employees")}
                      className={`p-2 rounded-2xl transition-all ${
                        activeTab === "employees" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveTab("documents")}
                      className={`p-2 rounded-2xl transition-all ${
                        activeTab === "documents" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveTab("whatsapp")}
                      className={`p-2 rounded-2xl transition-all ${
                        activeTab === "whatsapp" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* iPhone Home Indicator Line */}
            {device === "mobile" && (
              <div className="w-32 h-1 bg-white/40 rounded-full mx-auto my-3" />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

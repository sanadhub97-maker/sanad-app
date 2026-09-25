import React, { useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Palette,
  Clock,
  Mail,
  MessageSquare,
  Send,
  Loader2,
  UploadCloud,
  Check,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
  Sun,
  Moon,
  LayoutList,
  LayoutGrid,
  ShieldCheck,
  Globe,
  FileText,
  Receipt,
  Phone,
  MapPin,
  Navigation,
  Key,
  Server,
  Hash,
  AtSign,
  Briefcase,
  Layers,
  Sparkles,
  CheckCircle2,
  Sliders,
  AlertTriangle,
  Laptop,
  Printer,
  QrCode,
  Zap,
  Copy,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { AppleIcon } from "@/components/common/apple-icon";
import { AuthedFileImage } from "@/components/common/authed-file-image";
import { settingsApi, type CompanySettings, type AppearanceSettings, type EmailSettingsInput, type WhatsappSettingsInput } from "@/api/settings";
import { filesApi } from "@/api/files";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";
import { PrintDesignsTab } from "./print-designs-tab";
import { WhatsappLiveFeed } from "./whatsapp-live-feed";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canEdit = hasPermission("settings.edit");
  const isRtl = (i18n.language || "ar").startsWith("ar");

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Executive Page Header */}
      <PageHeader
        title={t("settings.title")}
        description={t("settings.subtitle")}
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/80 dark:bg-card/40 border border-border/80 shadow-xs backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {isRtl ? "النظام متزامن ومحدّث" : "System Synchronized & Active"}
            </span>
          </div>
        }
      />

      {/* Tabs Navigation & Panels */}
      <Tabs defaultValue="company" dir={isRtl ? "rtl" : "ltr"} className="space-y-6">
        {/* Executive Glass Capsule Tabs List */}
        <div className="overflow-x-auto pb-1 no-scrollbar flex items-center justify-start">
          <TabsList className="inline-flex h-auto p-1.5 rounded-2xl bg-card/75 dark:bg-card/45 backdrop-blur-xl border border-border/80 shadow-sm gap-1.5 min-w-full sm:min-w-0">
            <TabsTrigger
              value="company"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/20 hover:bg-muted/50"
            >
              <AppleIcon icon={Building2} tone="blue" size="xs" />
              <span>{t("settings.tabs.company")}</span>
            </TabsTrigger>

            <TabsTrigger
              value="appearance"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/20 hover:bg-muted/50"
            >
              <AppleIcon icon={Palette} tone="purple" size="xs" />
              <span>{t("settings.tabs.appearance")}</span>
            </TabsTrigger>

            <TabsTrigger
              value="print"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/20 hover:bg-muted/50"
            >
              <AppleIcon icon={Printer} tone="indigo" size="xs" />
              <span>{t("settings.tabs.print")}</span>
            </TabsTrigger>

            <TabsTrigger
              value="expiration"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/20 hover:bg-muted/50"
            >
              <AppleIcon icon={Clock} tone="amber" size="xs" />
              <span>{t("settings.tabs.expiration")}</span>
            </TabsTrigger>

            <TabsTrigger
              value="email"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/20 hover:bg-muted/50"
            >
              <AppleIcon icon={Mail} tone="rose" size="xs" />
              <span>{t("settings.tabs.email")}</span>
            </TabsTrigger>

            <TabsTrigger
              value="whatsapp"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/20 hover:bg-muted/50"
            >
              <AppleIcon icon={MessageSquare} tone="emerald" size="xs" />
              <span>{t("settings.tabs.whatsapp")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Company Profile */}
        <TabsContent value="company" className="focus-visible:outline-none">
          <CompanyTab canEdit={canEdit} isRtl={isRtl} />
        </TabsContent>

        {/* Tab 2: Appearance & Brand */}
        <TabsContent value="appearance" className="focus-visible:outline-none">
          <AppearanceTab canEdit={canEdit} isRtl={isRtl} />
        </TabsContent>

        {/* Print designs */}
        <TabsContent value="print" className="focus-visible:outline-none">
          <PrintDesignsTab canEdit={canEdit} isRtl={isRtl} />
        </TabsContent>

        {/* Tab 3: Expiration Rules */}
        <TabsContent value="expiration" className="focus-visible:outline-none">
          <ExpirationTab canEdit={canEdit} isRtl={isRtl} />
        </TabsContent>

        {/* Tab 4: Email SMTP */}
        <TabsContent value="email" className="focus-visible:outline-none">
          <EmailTab canEdit={canEdit} isRtl={isRtl} />
        </TabsContent>

        {/* Tab 5: WhatsApp API */}
        <TabsContent value="whatsapp" className="focus-visible:outline-none">
          <WhatsappTab canEdit={canEdit} isRtl={isRtl} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// -----------------------------------------------------------------------------
// TAB 1: COMPANY SETTINGS
// -----------------------------------------------------------------------------
function CompanyTab({ canEdit, isRtl }: { canEdit: boolean; isRtl: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings", "company"],
    queryFn: settingsApi.getCompany,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<CompanySettings>({
    values: data ?? {},
  });

  const mutation = useMutation({
    mutationFn: settingsApi.updateCompany,
    onSuccess: (res) => {
      toast.success(res.message ?? t("common.savedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["settings", "company"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const logoFileId = watch("logoFileId");
  const logoDarkFileId = watch("logoDarkFileId");
  const printLogoFileId = watch("printLogoFileId");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          {isRtl ? "جاري تحميل بيانات المنشأة..." : "Loading company settings..."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
      {/* Group 1: Corporate Identity & Legal */}
      <Card className="specular-border overflow-hidden border-border/80">
        <CardHeader className="bg-gradient-to-b from-muted/30 to-transparent border-b border-border/40 pb-5">
          <div className="flex items-center gap-3.5">
            <AppleIcon icon={ShieldCheck} tone="blue" size="md" />
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-foreground">
                {isRtl ? "بيانات المنشأة والسجلات الرسمية" : "Corporate Identity & Legal Records"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {isRtl
                  ? "الاسم الرسمي والسجل التجاري والرقم الضريبي المعتمد للجهات الحكومية"
                  : "Official legal name, commercial registration number, and tax identification"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <InputField label={t("settings.company.nameAr")} required icon={Building2}>
              <Input
                {...register("nameAr")}
                dir="rtl"
                placeholder={isRtl ? "مثال: شركة الرواد للموارد البشرية والحلول الإدارية" : "e.g. Al-Rowad HR & Management Solutions Co."}
                className="h-11 rounded-xl bg-background/60 font-medium"
              />
            </InputField>

            <InputField label={t("settings.company.nameEn")} icon={Globe}>
              <Input
                {...register("nameEn")}
                dir="ltr"
                placeholder="e.g. Al-Rowad HR & Management Solutions Co."
                className="h-11 rounded-xl bg-background/60 font-medium font-sans"
              />
            </InputField>

            <InputField label={t("settings.company.crNumber")} icon={FileText} hint={isRtl ? "10 أرقام" : "10 digits"}>
              <Input
                {...register("crNumber")}
                dir="ltr"
                placeholder="1010XXXXXX"
                className="h-11 rounded-xl bg-background/60 font-mono text-sm tracking-wider"
              />
            </InputField>

            <InputField label={t("settings.company.vatNumber")} icon={Receipt} hint={isRtl ? "15 رقماً" : "15 digits"}>
              <Input
                {...register("vatNumber")}
                dir="ltr"
                placeholder="300XXXXXXXXXXXX"
                className="h-11 rounded-xl bg-background/60 font-mono text-sm tracking-wider"
              />
            </InputField>
          </div>
        </CardContent>
      </Card>

      {/* Group 2: Contact & Headquarters */}
      <Card className="specular-border overflow-hidden border-border/80">
        <CardHeader className="bg-gradient-to-b from-muted/30 to-transparent border-b border-border/40 pb-5">
          <div className="flex items-center gap-3.5">
            <AppleIcon icon={MapPin} tone="cyan" size="md" />
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-foreground">
                {isRtl ? "المقر الرئيسي وبيانات التواصل" : "Headquarters & Contact Details"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {isRtl
                  ? "قنوات الاتصال الرسمية وعنوان المقر المعتمد في المراسلات والفواتير"
                  : "Official communication channels and registered headquarters address"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <InputField label={t("settings.company.phone")} icon={Phone}>
              <Input
                {...register("phone")}
                dir="ltr"
                placeholder="+966 11 XXX XXXX"
                className="h-11 rounded-xl bg-background/60 font-mono"
              />
            </InputField>

            <InputField label={t("settings.company.email")} icon={Mail}>
              <Input
                type="email"
                {...register("email")}
                dir="ltr"
                placeholder="info@company.sa"
                className="h-11 rounded-xl bg-background/60 font-medium"
              />
            </InputField>

            <InputField label={t("settings.company.website")} icon={Globe}>
              <Input
                {...register("website")}
                dir="ltr"
                placeholder="https://company.sa"
                className="h-11 rounded-xl bg-background/60 font-medium"
              />
            </InputField>

            <InputField label={t("settings.company.city")} icon={Building2}>
              <Input
                {...register("city")}
                placeholder={isRtl ? "الرياض" : "Riyadh"}
                className="h-11 rounded-xl bg-background/60 font-medium"
              />
            </InputField>

            <InputField label={t("settings.company.country")} icon={Globe}>
              <Input
                {...register("country")}
                placeholder={isRtl ? "المملكة العربية السعودية" : "Saudi Arabia"}
                className="h-11 rounded-xl bg-background/60 font-medium"
              />
            </InputField>

            <div className="sm:col-span-1">
              <InputField label={isRtl ? "الرمز البريدي / العنوان المختصر" : "Postal Code / Short Address"} icon={Navigation}>
                <Input
                  dir="ltr"
                  placeholder="12345 - 6789"
                  className="h-11 rounded-xl bg-background/60 font-mono text-sm"
                />
              </InputField>
            </div>

            <div className="sm:col-span-3">
              <InputField label={t("settings.company.address")} icon={Navigation}>
                <Input
                  {...register("address")}
                  placeholder={isRtl ? "طريق الملك فهد، حي الصحافة، برج الإدارة، الدور 8" : "King Fahd Road, Al-Sahafa District, Management Tower, Floor 8"}
                  className="h-11 rounded-xl bg-background/60 font-medium"
                />
              </InputField>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Group 3: Digital Brand Assets (Logo & Favicon) */}
      <Card className="specular-border overflow-hidden border-border/80">
        <CardHeader className="bg-gradient-to-b from-muted/30 to-transparent border-b border-border/40 pb-5">
          <div className="flex items-center gap-3.5">
            <AppleIcon icon={Sparkles} tone="purple" size="md" />
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-foreground">
                {isRtl ? "الأصول الرقمية والهوية البصرية" : "Digital Brand Assets & Visual Identity"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {isRtl ? (
                  <>شعار الشركة بيظهر في المطبوعات وتقارير <span className="font-bold text-foreground">PDF</span> وملفات التصدير بس. شعار وأيقونة النظام نفسه ثابتين ومش بيتغيروا.</>
                ) : (
                  <>The company logo appears on printed documents, <span className="font-bold text-foreground">PDF</span> reports and exports only. The system's own logo and icon stay fixed.</>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            <AssetUploadCard
              title={isRtl ? "شعار الوضع النهاري" : "Light mode logo"}
              subtitle={
                isRtl
                  ? "بيظهر في الشريط العلوي في الوضع النهاري"
                  : "Shown in the top bar in light mode"
              }
              aspectHint={isRtl ? "صيغة PNG أو SVG مفرغ • حتى 5 ميجابايت" : "Transparent PNG or SVG • up to 5MB"}
              previewType="logo"
              fileId={logoFileId}
              module="company-logo"
              onUploaded={(fid) => setValue("logoFileId", fid, { shouldDirty: true })}
              onRemoved={() => setValue("logoFileId", null, { shouldDirty: true })}
              disabled={!canEdit}
              isRtl={isRtl}
            />
            <AssetUploadCard
              title={isRtl ? "شعار الوضع الليلي" : "Dark mode logo"}
              subtitle={
                isRtl
                  ? "بيظهر في الشريط العلوي في الوضع الليلي. لو مش مرفوع، هيتستخدم شعار الوضع النهاري"
                  : "Shown in the top bar in dark mode. Falls back to the light logo if not set"
              }
              aspectHint={isRtl ? "يفضل نسخة فاتحة من الشعار • PNG مفرغ" : "Preferably a light-colored version • transparent PNG"}
              previewType="logo"
              fileId={logoDarkFileId}
              module="company-logo"
              onUploaded={(fid) => setValue("logoDarkFileId", fid, { shouldDirty: true })}
              onRemoved={() => setValue("logoDarkFileId", null, { shouldDirty: true })}
              disabled={!canEdit}
              isRtl={isRtl}
            />
            <AssetUploadCard
              title={isRtl ? "شعار الطباعة" : "Print logo"}
              subtitle={
                isRtl
                  ? "بيظهر في ملفات PDF: ملف الموظف، الإيصالات، والتقارير. لو مش مرفوع، هيتستخدم شعار الوضع النهاري"
                  : "Used on PDFs: employee profiles, receipts and reports. Falls back to the light logo if not set"
              }
              aspectHint={isRtl ? "يفضل نسخة واضحة على خلفية بيضاء • PNG مفرغ" : "Preferably a version that reads well on white • transparent PNG"}
              previewType="logo"
              fileId={printLogoFileId}
              module="company-logo"
              onUploaded={(fid) => setValue("printLogoFileId", fid, { shouldDirty: true })}
              onRemoved={() => setValue("printLogoFileId", null, { shouldDirty: true })}
              disabled={!canEdit}
              isRtl={isRtl}
            />
          </div>
        </CardContent>
      </Card>

      {/* Executive Floating/Sticky Action Bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-4 p-4 rounded-2xl bg-card/85 dark:bg-card/75 backdrop-blur-xl border border-border/80 shadow-luxury">
        <div className="flex items-center gap-2">
          {isDirty && (
            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 gap-1 text-xs">
              <AlertTriangle className="h-3 w-3" />
              {isRtl ? "توجد تعديلات غير محفوظة" : "Unsaved changes"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={!isDirty || isSubmitting}
            className="rounded-xl px-5 h-11 border-border/80 hover:bg-muted font-bold text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 me-2 text-muted-foreground" />
            {t("common.reset")}
          </Button>

          <Button
            type="submit"
            disabled={!canEdit || isSubmitting}
            className="rounded-xl px-6 h-11 bg-primary text-primary-foreground font-black text-xs shadow-md shadow-primary/25 hover:brightness-110"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Check className="h-4 w-4 me-2" />
            )}
            {t("common.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}

// -----------------------------------------------------------------------------
// TAB 2: APPEARANCE SETTINGS
// -----------------------------------------------------------------------------
function AppearanceTab({ canEdit, isRtl }: { canEdit: boolean; isRtl: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings", "appearance"],
    queryFn: settingsApi.getAppearance,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { isSubmitting },
  } = useForm<AppearanceSettings>({
    values: data,
  });

  const mutation = useMutation({
    mutationFn: settingsApi.updateAppearance,
    onSuccess: (res, variables) => {
      toast.success(res.message ?? t("common.savedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["settings", "appearance"] });
      if (variables.themeMode) {
        useUiStore.getState().setThemeMode(variables.themeMode);
      }
      if (typeof variables.animationsEnabled === "boolean") {
        useUiStore.getState().setAnimationsEnabled(variables.animationsEnabled);
      }
      if (variables.sidebarStyle) {
        useUiStore.getState().setSidebarCollapsed(variables.sidebarStyle === "collapsed");
      }
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const colorFields: { key: keyof AppearanceSettings; label: string; tone: string }[] = [
    { key: "primaryColor", label: t("settings.appearance.primary"), tone: "bg-blue-600" },
    { key: "secondaryColor", label: t("settings.appearance.secondary"), tone: "bg-slate-600" },
    { key: "accentColor", label: t("settings.appearance.accent"), tone: "bg-indigo-600" },
    { key: "successColor", label: t("settings.appearance.success"), tone: "bg-emerald-600" },
    { key: "warningColor", label: t("settings.appearance.warning"), tone: "bg-amber-500" },
    { key: "dangerColor", label: t("settings.appearance.danger"), tone: "bg-rose-600" },
    { key: "infoColor", label: t("settings.appearance.information"), tone: "bg-cyan-600" },
  ];

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          {isRtl ? "جاري تحميل إعدادات المظهر..." : "Loading appearance settings..."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
      {/* Theme Mode Selector */}
      <Card className="specular-border overflow-hidden border-border/80">
        <CardHeader className="bg-gradient-to-b from-muted/30 to-transparent border-b border-border/40 pb-5">
          <div className="flex items-center gap-3.5">
            <AppleIcon icon={Sun} tone="amber" size="md" />
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-foreground">
                {isRtl ? "وضع المظهر العام (Theme Mode)" : "Interface Theme Mode"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {isRtl
                  ? "اختر أسلوب العرض المفضل للواجهة بين السمة الفاتحة أو الداكنة الفاخرة"
                  : "Choose your preferred system appearance between Crisp Light and Obsidian Dark"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Controller
            control={control}
            name="themeMode"
            render={({ field }) => (
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Light Mode */}
                <button
                  type="button"
                  onClick={() => field.onChange("light")}
                  className={cn(
                    "relative flex flex-col items-center gap-3.5 p-5 rounded-2xl border-2 text-center transition-all duration-200 text-foreground cursor-pointer group",
                    field.value === "light"
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                      : "border-border/70 hover:border-border bg-card/60 hover:bg-muted/40"
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-105 transition-transform">
                    <Sun className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-black text-sm">{t("settings.appearance.light")}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isRtl ? "واجهة ناصعة بظلال كلاسيكية نقية" : "Pristine slate with crisp contrast"}
                    </p>
                  </div>
                  {field.value === "light" && (
                    <div className="absolute top-3 end-3 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>

                {/* Dark Mode */}
                <button
                  type="button"
                  onClick={() => field.onChange("dark")}
                  className={cn(
                    "relative flex flex-col items-center gap-3.5 p-5 rounded-2xl border-2 text-center transition-all duration-200 text-foreground cursor-pointer group",
                    field.value === "dark"
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                      : "border-border/70 hover:border-border bg-card/60 hover:bg-muted/40"
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                    <Moon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-black text-sm">{t("settings.appearance.dark")}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isRtl ? "أسود سبجي فاخر وتأثيرات زجاجية" : "Executive Obsidian and liquid glass"}
                    </p>
                  </div>
                  {field.value === "dark" && (
                    <div className="absolute top-3 end-3 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>

                {/* System Mode */}
                <button
                  type="button"
                  onClick={() => field.onChange("system")}
                  className={cn(
                    "relative flex flex-col items-center gap-3.5 p-5 rounded-2xl border-2 text-center transition-all duration-200 text-foreground cursor-pointer group",
                    field.value === "system"
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                      : "border-border/70 hover:border-border bg-card/60 hover:bg-muted/40"
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500 border border-sky-500/20 group-hover:scale-105 transition-transform">
                    <Laptop className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-black text-sm">{t("settings.appearance.system")}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isRtl ? "المزامنة التلقائية مع إعدادات جهازك" : "Sync automatically with OS preferences"}
                    </p>
                  </div>
                  {field.value === "system" && (
                    <div className="absolute top-3 end-3 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Sidebar Layout */}
      <Card className="specular-border overflow-hidden border-border/80">
        <CardHeader className="bg-gradient-to-b from-muted/30 to-transparent border-b border-border/40 pb-5">
          <div className="flex items-center gap-3.5">
            <AppleIcon icon={LayoutList} tone="indigo" size="md" />
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-foreground">
                {isRtl ? "نمط القائمة الجانبية (Sidebar Navigation)" : "Sidebar Navigation Style"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {isRtl ? "تحديد طريقة ظهور قائمة التنقل الرئيسية في سطح المكتب" : "Choose sidebar display mode on desktop screens"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Controller
            control={control}
            name="sidebarStyle"
            render={({ field }) => (
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => field.onChange("expanded")}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border-2 text-start transition-all duration-200 cursor-pointer",
                    field.value === "expanded"
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                      : "border-border/70 hover:border-border bg-card/60"
                  )}
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <LayoutList className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-foreground">{t("settings.appearance.expanded")}</div>
                    <p className="text-xs text-muted-foreground">
                      {isRtl ? "عرض الأيقونات مع النصوص وأسماء الأقسام" : "Full layout with labels and section headers"}
                    </p>
                  </div>
                  {field.value === "expanded" && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => field.onChange("collapsed")}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border-2 text-start transition-all duration-200 cursor-pointer",
                    field.value === "collapsed"
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                      : "border-border/70 hover:border-border bg-card/60"
                  )}
                >
                  <div className="h-10 w-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                    <LayoutGrid className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-foreground">{t("settings.appearance.collapsed")}</div>
                    <p className="text-xs text-muted-foreground">
                      {isRtl ? "عرض مدمج للأيقونات فقط لتوفير مساحة العمل" : "Compact icons-only mode to maximize workspace"}
                    </p>
                  </div>
                  {field.value === "collapsed" && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Brand Color Swatches */}
      <Card className="specular-border overflow-hidden border-border/80">
        <CardHeader className="bg-gradient-to-b from-muted/30 to-transparent border-b border-border/40 pb-5">
          <div className="flex items-center gap-3.5">
            <AppleIcon icon={Palette} tone="purple" size="md" />
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-foreground">
                {isRtl ? "منظومة ألوان العلامة التجارية" : "Brand Color System"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {isRtl ? "تخصيص لوحة الألوان الأساسية والحالات التنبيهية في واجهة النظام" : "Customize interface primary accent swatches and status alerts"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {colorFields.map((f) => {
              const currentValue = watch(f.key as keyof AppearanceSettings) as string;
              return (
                <div
                  key={f.key}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card/60 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-foreground">{f.label}</Label>
                    <div className="font-mono text-[11px] text-muted-foreground uppercase">
                      {currentValue || "#000000"}
                    </div>
                  </div>
                  <div className="relative flex items-center justify-center">
                    <input
                      type="color"
                      {...register(f.key as never)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div
                      className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-800 shadow-md ring-1 ring-black/10 transition-transform hover:scale-110"
                      style={{ backgroundColor: currentValue || "#000" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Experience & Animation Switches */}
      <Card className="specular-border overflow-hidden border-border/80">
        <CardHeader className="bg-gradient-to-b from-muted/30 to-transparent border-b border-border/40 pb-5">
          <div className="flex items-center gap-3.5">
            <AppleIcon icon={Sliders} tone="slate" size="md" />
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-foreground">
                {isRtl ? "تجربة الاستخدام والأداء" : "User Experience & Performance"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {isRtl ? "خيارات تسريع التصفح والتحكم في المؤثرات الحركية وكثافة البيانات" : "Control motion animations and table data density"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-card/60">
            <div className="space-y-0.5">
              <div className="font-bold text-sm text-foreground">
                {t("settings.appearance.enableAnimations")}
              </div>
              <p className="text-xs text-muted-foreground">
                {isRtl ? "تفعيل الانتقالات السلسة والظلال الانسيابية وتأثيرات التحويم" : "Enable fluid transitions, hover effects, and specular motion"}
              </p>
            </div>
            <Controller
              control={control}
              name="animationsEnabled"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-card/60">
            <div className="space-y-0.5">
              <div className="font-bold text-sm text-foreground">
                {t("settings.appearance.compactMode")}
              </div>
              <p className="text-xs text-muted-foreground">
                {isRtl ? "زيادة كثافة عرض الجداول لتقليل التمرير وعرض أكبر قدر من السجلات" : "Increase table row density to maximize visible records without scrolling"}
              </p>
            </div>
            <Controller
              control={control}
              name="compactMode"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!canEdit || isSubmitting}
          className="rounded-xl px-8 h-11 bg-primary text-primary-foreground font-black text-xs shadow-md shadow-primary/25 hover:brightness-110"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin me-2" />
          ) : (
            <Check className="h-4 w-4 me-2" />
          )}
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}

// -----------------------------------------------------------------------------
// TAB 3: EXPIRATION RULES
// -----------------------------------------------------------------------------
function ExpirationTab({ canEdit, isRtl }: { canEdit: boolean; isRtl: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings", "expiration"],
    queryFn: settingsApi.getExpirationRules,
  });

  const [thresholdDays, setThresholdDays] = useState(30);
  const [notifyDays, setNotifyDays] = useState("90, 60, 30, 15, 7, 3, 1");

  // Synchronize when data loads
  React.useEffect(() => {
    if (data) {
      setThresholdDays(data.expiringSoonThresholdDays ?? 30);
      setNotifyDays((data.notifyDaysBefore ?? [90, 60, 30, 15, 7, 3, 1]).join(", "));
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: settingsApi.updateExpirationRules,
    onSuccess: (res) => {
      toast.success(res.message ?? t("common.savedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["settings", "expiration"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          {isRtl ? "جاري تحميل قواعد الانتهاء..." : "Loading expiration rules..."}
        </p>
      </div>
    );
  }

  const notifyPills = notifyDays
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n));

  return (
    <div className="space-y-6">
      <Card className="specular-border overflow-hidden border-border/80">
        <CardHeader className="bg-gradient-to-b from-muted/30 to-transparent border-b border-border/40 pb-5">
          <div className="flex items-center gap-3.5">
            <AppleIcon icon={Clock} tone="amber" size="md" />
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-foreground">
                {t("settings.expiration.title")}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {t("settings.expiration.description")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Threshold Days */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-foreground">
                {t("settings.expiration.thresholdLabel")}
              </Label>
              <Badge variant="warning" className="font-mono text-xs px-2.5 py-0.5">
                {thresholdDays} {isRtl ? "يوماً" : "days"}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="1"
                max="365"
                value={thresholdDays}
                onChange={(e) => setThresholdDays(Number(e.target.value))}
                className="max-w-[140px] h-11 rounded-xl bg-background/60 font-mono font-bold text-center text-base"
              />
              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2">
                {[15, 30, 45, 60, 90].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setThresholdDays(preset)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer",
                      thresholdDays === preset
                        ? "border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "border-border/80 hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {preset} {isRtl ? "يوماً" : "days"}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {isRtl
                ? "تتحول بطاقة الوثيقة أو رخصة الإقامة إلى الحالة التحذيرية البرتقالية عندما يتبقى على انتهائها هذا العدد من الأيام."
                : "Documents and residence permits will switch to the orange warning state when remaining validity hits this threshold."}
            </p>
          </div>

          {/* Pre-expiry Notification Days */}
          <div className="space-y-3 pt-4 border-t border-border/60">
            <Label className="text-sm font-bold text-foreground">
              {t("settings.expiration.notifyLabel")}
            </Label>
            <Input
              value={notifyDays}
              onChange={(e) => setNotifyDays(e.target.value)}
              className="h-11 rounded-xl bg-background/60 font-mono text-sm"
              placeholder="90, 60, 30, 15, 7, 3, 1"
            />
            {/* Timeline Tag Visualization */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-muted-foreground me-1">
                {isRtl ? "مواعيد التنبيه المجدولة:" : "Scheduled alert milestones:"}
              </span>
              {notifyPills.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-muted text-foreground border border-border/80"
                >
                  {isRtl ? `قبل ${d} يوم` : `${d}d before`}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          disabled={!canEdit || mutation.isPending}
          onClick={() =>
            mutation.mutate({
              expiringSoonThresholdDays: thresholdDays,
              notifyDaysBefore: notifyDays
                .split(",")
                .map((s) => Number(s.trim()))
                .filter((n) => !Number.isNaN(n)),
            })
          }
          className="rounded-xl px-8 h-11 bg-primary text-primary-foreground font-black text-xs shadow-md shadow-primary/25 hover:brightness-110"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin me-2" />
          ) : (
            <Check className="h-4 w-4 me-2" />
          )}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// TAB 4: EMAIL SETTINGS (SMTP)
// -----------------------------------------------------------------------------
function EmailTab({ canEdit, isRtl }: { canEdit: boolean; isRtl: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings", "email"],
    queryFn: settingsApi.getEmail,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { isSubmitting },
  } = useForm<EmailSettingsInput>({
    values: data ? { ...data, password: "" } : undefined,
  });

  const [testTo, setTestTo] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const mutation = useMutation({
    mutationFn: settingsApi.updateEmail,
    onSuccess: (res: any) => {
      toast.success(res?.message ?? t("common.savedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["settings", "email"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const testMutation = useMutation({
    mutationFn: () => settingsApi.testEmail(testTo),
    onSuccess: (res) => toast.success(res.message),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const isEnabled = watch("enabled");

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          {isRtl ? "جاري تحميل إعدادات البريد..." : "Loading email gateway settings..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
        {/* Gateway Master Switch */}
        <Card className="specular-border overflow-hidden border-border/80">
          <CardHeader className="bg-gradient-to-b from-muted/30 to-transparent border-b border-border/40 pb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <AppleIcon icon={Mail} tone="rose" size="md" />
                <div>
                  <CardTitle className="text-base sm:text-lg font-black text-foreground">
                    {t("settings.email.title")}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.email.description")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={isEnabled ? "success" : "secondary"} className="text-xs px-3 py-1">
                  {isEnabled ? (isRtl ? "بوابة الإرسال مفعلة" : "Gateway Enabled") : (isRtl ? "معطلة" : "Disabled")}
                </Badge>
                <Controller
                  control={control}
                  name="enabled"
                  render={({ field }) => (
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <InputField label={t("settings.email.host")} icon={Server}>
                <Input
                  {...register("host")}
                  dir="ltr"
                  placeholder="smtp.office365.com / smtp.gmail.com"
                  className="h-11 rounded-xl bg-background/60 font-mono text-sm"
                />
              </InputField>

              <InputField label={t("settings.email.port")} icon={Hash}>
                <Input
                  type="number"
                  {...register("port")}
                  dir="ltr"
                  placeholder="587 / 465"
                  className="h-11 rounded-xl bg-background/60 font-mono text-sm"
                />
              </InputField>

              <InputField label={t("settings.email.username")} icon={AtSign}>
                <Input
                  {...register("username")}
                  dir="ltr"
                  placeholder="notifications@company.sa"
                  className="h-11 rounded-xl bg-background/60 font-mono text-sm"
                />
              </InputField>

              <InputField
                label={t("settings.email.password")}
                icon={Key}
                hint={data?.hasPassword ? (isRtl ? "كلمة المرور محفوظة" : "Password saved") : undefined}
              >
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    placeholder={t("settings.email.passwordPlaceholder")}
                    {...register("password")}
                    className="h-11 rounded-xl bg-background/60 font-mono text-sm pe-10 ps-3"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </InputField>

              <InputField label={t("settings.email.fromName")} icon={ShieldCheck}>
                <Input
                  {...register("fromName")}
                  placeholder={isRtl ? "نظام الموارد البشرية - شركة الرواد" : "HR System - Al-Rowad Co."}
                  className="h-11 rounded-xl bg-background/60 font-medium"
                />
              </InputField>

              <InputField label={t("settings.email.fromEmail")} icon={Mail}>
                <Input
                  type="email"
                  {...register("fromEmail")}
                  dir="ltr"
                  placeholder="no-reply@company.sa"
                  className="h-11 rounded-xl bg-background/60 font-mono text-sm"
                />
              </InputField>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!canEdit || isSubmitting}
            className="rounded-xl px-8 h-11 bg-primary text-primary-foreground font-black text-xs shadow-md shadow-primary/25 hover:brightness-110"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Check className="h-4 w-4 me-2" />
            )}
            {t("common.save")}
          </Button>
        </div>
      </form>

      {/* Direct SMTP Test Tool */}
      <Card className="specular-border overflow-hidden border-border/80 bg-muted/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                {isRtl ? "اختبار الاتصال بالخادم وإرسال بريد تجريبي" : "Server Connectivity Test & Trial Email"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {isRtl
                  ? "تحقق من صحة بيانات الاعتماد والاتصال بخادم البريد قبل حفظ الإعدادات نهائياً"
                  : "Verify credentials and server reachability before saving configurations"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-col sm:flex-row items-center gap-3 max-w-xl">
            <Input
              type="email"
              placeholder={t("settings.email.sendTestTo")}
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              className="h-11 rounded-xl bg-background text-sm flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={!testTo || testMutation.isPending}
              className="rounded-xl h-11 px-5 border-border font-bold text-xs shrink-0 w-full sm:w-auto"
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Send className="h-4 w-4 me-2" />
              )}
              {t("common.sendTest")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// TAB 5: WHATSAPP API SETTINGS
// -----------------------------------------------------------------------------
function WhatsappTab({ canEdit, isRtl }: { canEdit: boolean; isRtl: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings", "whatsapp"],
    queryFn: settingsApi.getWhatsapp,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { isSubmitting },
  } = useForm<WhatsappSettingsInput>({
    values: data
      ? {
          ...data,
          provider: data.provider === "CALLMEBOT" || data.provider === "WHATSAPP_WEB" ? data.provider : "META",
          apiKey: "",
        }
      : undefined,
  });

  const [showApiKey, setShowApiKey] = useState(false);

  const mutation = useMutation({
    mutationFn: settingsApi.updateWhatsapp,
    onSuccess: (res: any) => {
      toast.success(res?.message ?? t("common.savedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["settings", "whatsapp"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const isEnabled = watch("enabled");
  const isCallMeBot = watch("provider") === "CALLMEBOT";
  const isWhatsappWeb = watch("provider") === "WHATSAPP_WEB";

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          {isRtl ? "جاري تحميل إعدادات واتساب..." : "Loading WhatsApp settings..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
        {/* Gateway Master Switch & Form */}
        <Card className="specular-border overflow-hidden border-border/80">
          <CardHeader className="bg-gradient-to-b from-muted/30 to-transparent border-b border-border/40 pb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <AppleIcon icon={MessageSquare} tone="emerald" size="md" />
                <div>
                  <CardTitle className="text-base sm:text-lg font-black text-foreground">
                    {t("settings.whatsapp.title")}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.whatsapp.description")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={isEnabled ? "success" : "secondary"} className="text-xs px-3 py-1">
                  {isEnabled
                    ? isWhatsappWeb
                      ? isRtl ? "الربط بـ QR نشط" : "QR link active"
                      : isCallMeBot
                      ? isRtl ? "CallMeBot نشط" : "CallMeBot Active"
                      : isRtl ? "واتساب كلاود API نشط" : "WhatsApp Cloud API Active"
                    : isRtl ? "معطل" : "Disabled"}
                </Badge>
                <Controller
                  control={control}
                  name="enabled"
                  render={({ field }) => (
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <InputField label={t("settings.whatsapp.provider")} icon={Layers}>
                  <Controller
                    control={control}
                    name="provider"
                    render={({ field }) => (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          {
                            value: "WHATSAPP_WEB",
                            label: isRtl ? "ربط مباشر عبر رمز QR" : "Direct QR Web Gateway",
                            sub: isRtl ? "تشفير سحابي E2EE بدون رسوم" : "E2EE multi-device linking",
                            badge: isRtl ? "الأكثر استخداماً" : "Popular",
                            icon: QrCode,
                            color: "emerald",
                          },
                          {
                            value: "CALLMEBOT",
                            label: isRtl ? "بوابة CallMeBot الفورية" : "CallMeBot Gateway",
                            sub: isRtl ? "إرسال سريع للأرقام المسجلة" : "Instant direct gateway",
                            badge: isRtl ? "تفعيل سريع" : "Fast Setup",
                            icon: Zap,
                            color: "sky",
                          },
                          {
                            value: "META",
                            label: isRtl ? "بوابة أعمال ميتا الرسمية" : "Meta Cloud Business API",
                            sub: isRtl ? "واجهة Meta Graph للمؤسسات" : "Official enterprise API",
                            badge: isRtl ? "معتمد رسمياً" : "Official",
                            icon: Building2,
                            color: "indigo",
                          },
                        ].map((opt) => {
                          const isSelected = field.value === opt.value;
                          const IconComp = opt.icon;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => field.onChange(opt.value)}
                              className={cn(
                                "relative group flex flex-col text-start p-3.5 rounded-2xl border transition-all cursor-pointer overflow-hidden",
                                isSelected
                                  ? "border-emerald-500/60 bg-gradient-to-br from-emerald-500/10 via-emerald-500/[0.04] to-transparent ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/10 dark:bg-slate-900/80"
                                  : "border-border/70 bg-background/50 hover:border-border hover:bg-muted/30"
                              )}
                            >
                              {/* Specular Top Glow on Selected */}
                              {isSelected && (
                                <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />
                              )}
                              <div className="flex items-center justify-between w-full mb-2">
                                <div
                                  className={cn(
                                    "h-8 w-8 rounded-xl flex items-center justify-center transition-colors",
                                    isSelected
                                      ? "bg-emerald-500 text-white shadow-xs"
                                      : "bg-muted text-muted-foreground group-hover:text-foreground"
                                  )}
                                >
                                  <IconComp className="h-4 w-4" />
                                </div>
                                <span
                                  className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                    isSelected
                                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                      : "bg-muted/70 text-muted-foreground border border-border/40"
                                  )}
                                >
                                  {opt.badge}
                                </span>
                              </div>
                              <span className="text-xs font-black tracking-tight text-foreground mb-0.5">
                                {opt.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground leading-tight">
                                {opt.sub}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                </InputField>
              </div>

              {isWhatsappWeb ? (
                <div className="sm:col-span-2 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4 text-xs leading-relaxed space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>
                      {isRtl
                        ? "إرشادات الربط المباشر لجلسة واتساب السحابية:"
                        : "Direct WhatsApp Session Linking Guidelines:"}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {isRtl
                      ? "يقوم نظام SanaD بإرسال إشعارات وتنبيهات المنشأة تلقائياً عبر جلسة ربط سحابية مخصصة. للحفاظ على استمرارية الخدمة وتفادي قيود الإرسال الآلي، يُوصى باستخدام شريحة رقم أعمال مخصصة للتنبيهات."
                      : "SanaD dispatches scheduled alerts automatically via a dedicated cloud session. To preserve business continuity and avoid automation limits, using a dedicated business line is strongly recommended."}
                  </p>
                </div>
              ) : isCallMeBot ? (
                <>
                  <div className="sm:col-span-2 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 text-xs leading-relaxed space-y-2.5 shadow-xs">
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <Zap className="h-4 w-4 text-emerald-500" />
                      <span>
                        {isRtl ? "إجراءات مصادقة بوابة CallMeBot الفورية:" : "CallMeBot Authentication Procedure:"}
                      </span>
                    </div>
                    <ol className="list-decimal ps-5 space-y-1.5 text-muted-foreground">
                      <li>
                        {isRtl ? "إضافة رقم الخدمة المعتمد لجهات الاتصال في هاتفك: " : "Save the official gateway number to contacts: "}
                        <bdi dir="ltr" className="font-mono font-bold text-foreground bg-muted/60 px-1.5 py-0.5 rounded">+34 623 80 11 90</bdi>
                      </li>
                      <li>
                        {isRtl ? "إرسال رسالة التفعيل التالية عبر تطبيق واتساب: " : "Send the activation message on WhatsApp: "}
                        <bdi dir="ltr" className="font-mono font-bold text-foreground bg-muted/60 px-1.5 py-0.5 rounded">I allow callmebot to send me messages</bdi>
                      </li>
                      <li>
                        {isRtl
                          ? "سيصلك مفتاح الترخيص والـ API الفوري؛ قم بإدراجه بجانب رقمك في قائمة المستلمين المعتمدة بالأسفل."
                          : "You will receive an instant API key; insert it beside your number in the authorized recipients roster below."}
                      </li>
                    </ol>
                    <p className="text-muted-foreground text-[11px] pt-1 border-t border-border/40">
                      {isRtl
                        ? "الخدمة المباشرة تتيح الإرسال الفوري للرقم المرخص له. للتحقق من مزيد من التفاصيل "
                        : "Direct gateway delivers to the authorized number. For more details "}
                      <a
                        href="https://www.callmebot.com/blog/free-api-whatsapp-messages/"
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-emerald-600 dark:text-emerald-400 underline underline-offset-2"
                      >
                        {isRtl ? "تفضل بزيارة البوابة الرسمية" : "visit their official portal"}
                      </a>
                      .
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="sm:col-span-2">
                    <InputField label={t("settings.whatsapp.apiUrl")} icon={Globe}>
                      <Input
                        {...register("apiUrl")}
                        dir="ltr"
                        placeholder="https://graph.facebook.com/v20.0"
                        className="h-11 rounded-xl bg-background/60 font-mono text-sm"
                      />
                    </InputField>
                  </div>

                  <div className="sm:col-span-2">
                    <InputField
                      label={t("settings.whatsapp.apiKey")}
                      icon={Key}
                      hint={data?.hasApiKey ? (isRtl ? "مفتاح API الدائم محفوظ ومشفّر" : "Permanent API key encrypted") : undefined}
                    >
                      <div className="relative">
                        <Input
                          type={showApiKey ? "text" : "password"}
                          dir="ltr"
                          placeholder={t("settings.whatsapp.apiKeyPlaceholder")}
                          {...register("apiKey")}
                          className="h-11 rounded-xl bg-background/60 font-mono text-sm pe-10 ps-3"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </InputField>
                  </div>

                  <InputField label={t("settings.whatsapp.phoneNumberId")} icon={Phone}>
                    <Input
                      {...register("phoneNumberId")}
                      dir="ltr"
                      placeholder="e.g. 104598124982341"
                      className="h-11 rounded-xl bg-background/60 font-mono text-sm"
                    />
                  </InputField>

                  <InputField label={t("settings.whatsapp.businessAccountId")} icon={Briefcase}>
                    <Input
                      {...register("businessAccountId")}
                      dir="ltr"
                      placeholder="e.g. 981249823410459"
                      className="h-11 rounded-xl bg-background/60 font-mono text-sm"
                    />
                  </InputField>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!canEdit || isSubmitting}
            className="rounded-xl px-8 h-11 bg-primary text-primary-foreground font-black text-xs shadow-md shadow-primary/25 hover:brightness-110"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Check className="h-4 w-4 me-2" />
            )}
            {t("common.save")}
          </Button>
        </div>
      </form>

      {isWhatsappWeb && (
        <WhatsappWebLinkCard canEdit={canEdit} isRtl={isRtl} saved={data.provider === "WHATSAPP_WEB" && data.enabled} />
      )}
      <WhatsappRecipientsCard canEdit={canEdit} isRtl={isRtl} isCallMeBot={isCallMeBot} />
      <WhatsappLiveFeed isRtl={isRtl} />
    </div>
  );
}

function WhatsappWebLinkCard({ canEdit, isRtl, saved }: { canEdit: boolean; isRtl: boolean; saved: boolean }) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<"qr" | "code">("qr");
  const [pairPhone, setPairPhone] = useState("");
  const { data: status } = useQuery({
    queryKey: ["settings", "whatsapp", "web-status"],
    queryFn: settingsApi.getWhatsappWebStatus,
    // Poll while a link is in progress; stop once settled.
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "qr" || s === "pairing" || s === "connecting" || s === "finishing" ? 2000 : false;
    },
  });

  const connect = useMutation({
    mutationFn: (phone?: string) => settingsApi.connectWhatsappWeb(phone),
    onSuccess: (s) => queryClient.setQueryData(["settings", "whatsapp", "web-status"], s),
    onError: (err) => toast.error(getErrorMessage(err)),
  });
  const logout = useMutation({
    mutationFn: settingsApi.logoutWhatsappWeb,
    onSuccess: (s) => {
      queryClient.setQueryData(["settings", "whatsapp", "web-status"], s);
      toast.success(isRtl ? "تم فك ربط الجلسة بنجاح" : "Session unlinked successfully");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const s = status?.status ?? "disconnected";
  const phoneDigits = pairPhone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length >= 8 && phoneDigits.length <= 15;
  const start = () => connect.mutate(method === "code" ? "+" + phoneDigits : undefined);
  const inProgress = s === "qr" || s === "pairing" || s === "connecting";

  const badgeText =
    s === "connected"
      ? isRtl ? "جلسة نشطة ومؤمنة" : "Active & Encrypted"
      : s === "qr"
        ? isRtl ? "في انتظار المسح الضوئي" : "Awaiting QR Scan"
        : s === "pairing"
          ? isRtl ? "في انتظار إدخال الرمز" : "Awaiting Code Entry"
          : s === "finishing"
            ? isRtl ? "جاري إتمام الربط..." : "Finalizing Link..."
            : s === "connecting"
              ? isRtl ? "جاري الاتصال السحابي..." : "Connecting..."
              : isRtl ? "غير متصل" : "Not Linked";

  return (
    <Card className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-xl transition-all dark:border-white/10">
      {/* Specular Top Hairline */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 z-10" />

      <CardHeader className="pb-4 border-b border-border/60 bg-muted/20 dark:bg-slate-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AppleIcon icon={QrCode} tone="emerald" size="md" />
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-black tracking-tight text-foreground">
                  {isRtl ? "استوديو الربط والمصادقة السحابية" : "Cloud Pairing & Linking Studio"}
                </CardTitle>
                <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline-block">Baileys Multi-Device</span>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {isRtl
                  ? "إدارة جلسة البث المباشر وتفويض النظام بإرسال تنبيهات الأعمال المشفرة E2EE"
                  : "Manage cloud broadcasting session and authorize automated end-to-end encrypted alerts"}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider shadow-xs",
                s === "connected"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : s === "qr" || s === "pairing"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse"
                  : "bg-muted text-muted-foreground border border-border/50"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  s === "connected"
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                    : s === "qr" || s === "pairing"
                    ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                    : "bg-slate-400"
                )}
              />
              <span>{badgeText}</span>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-5">
        {s === "connected" ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/[0.03] to-transparent p-5 backdrop-blur-md shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black shadow-inner ring-2 ring-emerald-500/20">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-bold">
                      {isRtl ? "جلسة الإرسال النشطة:" : "Active Gateway Line:"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ {isRtl ? "معتمد وموثق" : "Verified"}
                    </span>
                  </div>
                  <bdi dir="ltr" className="font-mono text-xl font-black text-foreground tracking-wider mt-0.5 block">
                    {status?.phone}
                  </bdi>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={!canEdit || logout.isPending}
                onClick={() => logout.mutate()}
                className="rounded-xl h-11 px-5 text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
              >
                {logout.isPending ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Trash2 className="h-4 w-4 me-2" />}
                {isRtl ? "إنهاء الجلسة وفك الربط" : "Terminate & Unlink"}
              </Button>
            </div>
          </div>
        ) : s === "finishing" ? (
          <div className="flex items-start gap-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 shadow-xs">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-black text-foreground text-sm">
                {isRtl ? "تمت المصادقة بنجاح — جاري مزامنة مفاتيح التشفير" : "Authenticated — Syncing Cryptographic Keys"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isRtl
                  ? "يرجى إبقاء الهاتف متصلاً بالإنترنت لعدة ثوانٍ؛ يتم الآن استكمال تبادل المفاتيح وتأسيس اتصال الأجهزة المتعددة الآمن."
                  : "Keep WhatsApp open on the phone for a few moments while the multi-device connection finalizes."}
              </p>
            </div>
          </div>
        ) : s === "qr" && status?.qr ? (
          <div className="flex flex-col lg:flex-row items-center gap-8 py-2">
            {/* 🎯 Futuristic Scanner Studio Frame with Corner Targets & Laser Sweep */}
            <div className="relative p-4 rounded-3xl bg-slate-950 border-2 border-emerald-500/40 shadow-2xl shadow-emerald-500/10 group overflow-hidden">
              {/* Corner Targets */}
              <div className="absolute top-2 start-2 w-4 h-4 border-t-2 border-s-2 border-emerald-400" />
              <div className="absolute top-2 end-2 w-4 h-4 border-t-2 border-e-2 border-emerald-400" />
              <div className="absolute bottom-2 start-2 w-4 h-4 border-b-2 border-s-2 border-emerald-400" />
              <div className="absolute bottom-2 end-2 w-4 h-4 border-b-2 border-e-2 border-emerald-400" />

              {/* QR Image */}
              <div className="relative rounded-2xl overflow-hidden bg-white p-2">
                <img src={status.qr} alt="WhatsApp QR" className="h-56 w-56 object-contain" />

                {/* Animated Green Laser Sweep Line */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,1)] laser-sweep-line pointer-events-none" />
              </div>

              {/* Scanner Badge */}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{isRtl ? "امسح الرمز ضوئياً بالكاميرا" : "Scan via Camera"}</span>
              </div>
            </div>

            {/* Instruction Steps */}
            <div className="flex-1 space-y-4 text-xs">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-foreground">
                  {isRtl ? "خطوات المصادقة السريعة عبر تطبيق واتساب:" : "Quick WhatsApp Authentication Steps:"}
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {isRtl
                    ? "اتبع الخطوات التالية من هاتفك المحمول لمصادقة النظام كجهاز فرعي آمن:"
                    : "Follow these steps from your mobile device to link SanaD as a trusted multi-device client:"}
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  isRtl ? "افتح تطبيق واتساب على الهاتف المخصص لبث إشعارات المنشأة." : "Open WhatsApp on the device chosen for enterprise alerts.",
                  isRtl ? "انتقل إلى: الإعدادات ← الأجهزة المرتبطة ← ربط جهاز." : "Navigate to: Settings → Linked Devices → Link a Device.",
                  isRtl ? "وجّه كاميرا الهاتف نحو رمز الاستجابة السريعة (QR) الظاهر أمامك." : "Point your camera at this QR code to finalize automatic authorization.",
                ].map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 rounded-xl bg-muted/30 border border-border/50 p-2.5">
                    <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-foreground/90 font-medium leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>{isRtl ? "يتجدد الرمز تلقائياً للحفاظ على أعلى درجات الأمان." : "Code regenerates periodically for top security."}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => logout.mutate()}
                  className="text-xs text-destructive hover:bg-destructive/10"
                >
                  {isRtl ? "إلغاء والعودة" : "Cancel"}
                </Button>
              </div>
            </div>
          </div>
        ) : s === "pairing" && status?.pairingCode ? (
          <div className="flex flex-col lg:flex-row items-center gap-8 py-2">
            {/* Holographic Pairing Code Block */}
            <div className="rounded-3xl border-2 border-dashed border-emerald-500/50 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-6 text-center shadow-xl">
              <span className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">
                {isRtl ? "رمز المصادقة الرقمي" : "Pairing Verification Token"}
              </span>
              <div
                dir="ltr"
                className="font-mono text-3xl sm:text-4xl font-black tracking-[0.25em] text-emerald-500 dark:text-emerald-400 select-all py-2"
              >
                {status.pairingCode}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(status.pairingCode || "");
                  toast.success(isRtl ? "تم نسخ الرمز" : "Code copied");
                }}
                className="mt-2 rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5 me-1.5" />
                {isRtl ? "نسخ الرمز" : "Copy Token"}
              </Button>
            </div>

            {/* Instruction Steps */}
            <div className="flex-1 space-y-4 text-xs">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-foreground">
                  {isRtl ? "خطوات الربط برقم الهاتف:" : "Link With Phone Number Steps:"}
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {isRtl
                    ? "أدخل هذا الرمز المكون من 8 أحرف في تطبيق واتساب بهاتفك لتفعيل الجلسة:"
                    : "Enter this 8-character verification token into WhatsApp on your phone:"}
                </p>
              </div>

              <div className="space-y-2">
                {[
                  isRtl ? "افتح تطبيق واتساب على هاتفك." : "Open WhatsApp on your mobile phone.",
                  isRtl ? "انتقل إلى: الإعدادات ← الأجهزة المرتبطة ← ربط جهاز." : "Navigate to: Settings → Linked Devices → Link a Device.",
                  isRtl ? "اضغط على «الربط برقم الهاتف بدلاً من ذلك» أسفل شاشة الكاميرا." : "Tap “Link with phone number instead” below the camera frame.",
                  isRtl ? "أدخل رمز التحقق الظاهر هنا، وسيتم الربط فورياً." : "Type the token above and the connection will establish instantly.",
                ].map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 rounded-xl bg-muted/30 border border-border/50 p-2.5">
                    <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-foreground/90 font-medium leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => logout.mutate()}
                  className="text-xs text-destructive hover:bg-destructive/10"
                >
                  {isRtl ? "إلغاء والعودة" : "Cancel"}
                </Button>
              </div>
            </div>
          </div>
        ) : s === "connecting" ? (
          <div className="flex items-center justify-center gap-3 py-10 text-sm font-bold text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            <span>{isRtl ? "جاري الاتصال وتأسيس الجلسة السحابية المشفرة..." : "Establishing encrypted cloud session..."}</span>
          </div>
        ) : (
          <div className="space-y-5">
            <p className={cn("text-xs leading-relaxed", saved && !status?.lastError ? "text-muted-foreground" : "font-bold text-amber-600 dark:text-amber-400")}>
              {!saved
                ? isRtl
                  ? "يرجى حفظ إعدادات المزود بالأعلى أولاً بالضغط على «حفظ التغييرات»، ثم بدء الربط."
                  : "Please save provider settings above first before initiating device pairing."
                : status?.lastError
                ? status.lastError
                : isRtl
                ? "اختر وسيلة المصادقة والربط السحابي المفضلة لديك:"
                : "Select your preferred cloud authentication method:"}
            </p>

            {/* Method Cards */}
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
              {(
                [
                  [
                    "qr",
                    isRtl ? "مسح رمز الاستجابة السريعة (QR Code)" : "Scan QR Code",
                    isRtl ? "المسح المباشر بكاميرا الهاتف من قائمة الأجهزة المرتبطة" : "Direct scan via mobile camera from Linked Devices",
                    QrCode,
                  ],
                  [
                    "code",
                    isRtl ? "الربط بواسطة كود التحقق الرقمي" : "Pairing Token Code",
                    isRtl ? "إدخال كود رسمي مكون من 8 رموز على الهاتف بدلاً من الكاميرا" : "Enter an 8-character pairing token directly on the device",
                    Smartphone,
                  ],
                ] as const
              ).map(([id, title, hint, IconComp]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={method === id}
                  onClick={() => setMethod(id)}
                  className={cn(
                    "relative group flex items-start gap-3.5 rounded-2xl border p-4 text-start transition-all cursor-pointer",
                    method === id
                      ? "border-emerald-500/60 bg-gradient-to-br from-emerald-500/10 via-emerald-500/[0.03] to-transparent ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/10 dark:bg-slate-900/80"
                      : "border-border/70 bg-background/50 hover:border-border hover:bg-muted/30"
                  )}
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      method === id ? "bg-emerald-500 text-white shadow-xs" : "bg-muted text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    <IconComp className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-black text-foreground">{title}</div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">{hint}</div>
                  </div>
                </button>
              ))}
            </div>

            {method === "code" && (
              <div className="space-y-1.5 max-w-sm pt-1">
                <Label htmlFor="wa-pair-phone" className="text-xs font-bold text-foreground">
                  {isRtl ? "رقم الهاتف المخصص للإرسال (مع الرمز الدولي)" : "Sending Phone Number (with Country Code)"}
                </Label>
                <Input
                  id="wa-pair-phone"
                  dir="ltr"
                  inputMode="tel"
                  placeholder="+966 5X XXX XXXX"
                  value={pairPhone}
                  onChange={(e) => setPairPhone(e.target.value)}
                  className="h-11 rounded-xl font-mono text-sm bg-background/60"
                />
              </div>
            )}

            <div className="pt-1">
              <Button
                type="button"
                disabled={!canEdit || !saved || connect.isPending || inProgress || (method === "code" && !phoneValid)}
                onClick={start}
                className="rounded-xl h-11 px-7 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                {connect.isPending ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <QrCode className="h-4 w-4 me-2" />}
                {method === "code"
                  ? isRtl ? "توليد كود المصادقة الرقمي" : "Generate Pairing Token"
                  : isRtl ? "عرض رمز الاستجابة السريعة (QR)" : "Display Live QR Code"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type RecipientRow = { id?: string; name: string; phone: string; enabled: boolean; apiKey: string; hasApiKey: boolean };

function WhatsappRecipientsCard({ canEdit, isRtl, isCallMeBot }: { canEdit: boolean; isRtl: boolean; isCallMeBot: boolean }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings", "whatsapp", "recipients"],
    queryFn: settingsApi.getWhatsappRecipients,
  });

  const [rows, setRows] = useState<RecipientRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [testingPhone, setTestingPhone] = useState<string | null>(null);

  React.useEffect(() => {
    if (data && !dirty) setRows(data.map((r) => ({ ...r, apiKey: "" })));
  }, [data, dirty]);

  function update(index: number, patch: Partial<RecipientRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setDirty(true);
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      settingsApi.updateWhatsappRecipients(
        rows.map(({ id, name, phone, enabled, apiKey }) => ({ id, name, phone, enabled, apiKey: apiKey || undefined }))
      ),
    onSuccess: (saved) => {
      queryClient.setQueryData(["settings", "whatsapp", "recipients"], saved);
      setRows(saved.map((r) => ({ ...r, apiKey: "" })));
      setDirty(false);
      toast.success(isRtl ? "تم حفظ دليل أرقام المستلمين بنجاح" : "Recipients roster saved successfully");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  async function sendTest(phone: string) {
    setTestingPhone(phone);
    try {
      const res = await settingsApi.testWhatsapp(phone);
      toast.success(res.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTestingPhone(null);
    }
  }

  const activeCount = rows.filter((r) => r.enabled).length;

  return (
    <Card className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-xl transition-all dark:border-white/10">
      {/* Specular Top Hairline */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 z-10" />

      <CardHeader className="pb-4 border-b border-border/60 bg-muted/20 dark:bg-slate-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AppleIcon icon={Phone} tone="emerald" size="md" />
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-black tracking-tight text-foreground">
                  {isRtl ? "دليل أرقام الإشعار والتنبيه المعتمدة" : "Authorized Alert Recipients Directory"}
                </CardTitle>
                <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline-block">VIP Routing</span>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {isCallMeBot
                  ? isRtl
                    ? "قائمة الأرقام المصادق عليها لاستلام التنبيهات مع مفاتيح ترخيص CallMeBot المخصصة"
                    : "Authorized recipient roster configured with dedicated CallMeBot license tokens"
                  : isRtl
                    ? "إدارة أرقام القيادة والمشرفين المخولين باستلام إشعارات الصلاحية والتنبيهات المجدولة فورياً"
                    : "Manage leadership and supervisor lines authorized to receive automated scheduled alerts"}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isRtl ? `${activeCount} خط إشعار نشط` : `${activeCount} Active Lines`}</span>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 py-10 px-4 text-center">
            <Phone className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-bold text-foreground mb-1">
              {isRtl ? "لم يتم تسجيل أي أرقام استلام حتى الآن" : "No recipient numbers registered yet"}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {isRtl
                ? "أضف الرقم الأول للمسؤول أو المدير التنفيذي لبدء توجيه التنبيهات المباشرة إليه."
                : "Add the first executive or supervisor line to start routing live alerts."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => {
              const needsKey = isCallMeBot && !row.hasApiKey && !row.apiKey;
              const initials = row.name ? row.name.slice(0, 2).toUpperCase() : `#${index + 1}`;

              return (
                <div
                  key={row.id ?? `new-${index}`}
                  className={cn(
                    "group relative flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all",
                    row.enabled
                      ? "border-border/80 bg-gradient-to-br from-background via-background/90 to-muted/20 shadow-xs hover:border-emerald-500/40"
                      : "border-dashed border-border/60 bg-muted/20 opacity-60"
                  )}
                >
                  <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3">
                    {/* Avatar Initials Chip */}
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs font-mono shrink-0 shadow-2xs",
                        row.enabled
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground border border-border/40"
                      )}
                    >
                      {initials}
                    </div>

                    {/* Name Input */}
                    <div className="flex-1 min-w-[140px]">
                      <Input
                        id={`recipient-name-${index}`}
                        value={row.name}
                        onChange={(e) => update(index, { name: e.target.value })}
                        placeholder={isRtl ? "اسم المسؤول أو المنصب (مثال: المدير العام)" : "Recipient Name or Role"}
                        disabled={!canEdit}
                        className="h-10 rounded-xl text-xs font-semibold bg-background/60"
                      />
                    </div>

                    {/* Phone Input */}
                    <div className="flex-1 min-w-[180px]">
                      <Input
                        id={`recipient-phone-${index}`}
                        value={row.phone}
                        onChange={(e) => update(index, { phone: e.target.value })}
                        placeholder="+9665XXXXXXXX"
                        dir="ltr"
                        disabled={!canEdit}
                        className="h-10 rounded-xl font-mono text-xs font-bold bg-background/60"
                      />
                    </div>

                    {/* CallMeBot API Key */}
                    {isCallMeBot && (
                      <div className="flex-1 min-w-[140px]">
                        <Input
                          id={`recipient-key-${index}`}
                          value={row.apiKey}
                          onChange={(e) => update(index, { apiKey: e.target.value })}
                          placeholder={row.hasApiKey ? (isRtl ? "المفتاح محفوظ ومشفّر ✓" : "Key encrypted ✓") : isRtl ? "مفتاح API الخاص بالرقم" : "API Key"}
                          dir="ltr"
                          disabled={!canEdit}
                          className={cn("h-10 rounded-xl font-mono text-xs bg-background/60", needsKey && "border-amber-500/60 ring-1 ring-amber-500/30")}
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions & Switch */}
                  <div className="flex items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                    <div className="flex items-center gap-2 me-1">
                      <span className="text-[11px] font-bold text-muted-foreground">
                        {row.enabled ? (isRtl ? "مفعّل" : "Active") : isRtl ? "معطّل" : "Off"}
                      </span>
                      <Switch
                        checked={row.enabled}
                        onCheckedChange={(v) => update(index, { enabled: v })}
                        disabled={!canEdit}
                        aria-label={isRtl ? "تفعيل الرقم" : "Enable number"}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      title={dirty ? (isRtl ? "احفظ أولاً للاختبار" : "Save first to test") : isRtl ? "إرسال رسالة اختبار حية" : "Send live test"}
                      disabled={!row.id || dirty || testingPhone !== null}
                      onClick={() => sendTest(row.phone)}
                      className="h-9 px-3 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                    >
                      {testingPhone === row.phone ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" />
                      ) : (
                        <Send className="h-3.5 w-3.5 me-1.5" />
                      )}
                      <span>{isRtl ? "اختبار" : "Test"}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={isRtl ? "حذف الرقم" : "Remove"}
                      disabled={!canEdit}
                      onClick={() => {
                        setRows((prev) => prev.filter((_, i) => i !== index));
                        setDirty(true);
                      }}
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            disabled={!canEdit}
            onClick={() => {
              setRows((prev) => [...prev, { name: "", phone: "", enabled: true, apiKey: "", hasApiKey: false }]);
              setDirty(true);
            }}
            className="rounded-xl h-11 px-5 text-xs font-black border-border/80 hover:bg-muted cursor-pointer"
          >
            + {isRtl ? "إضافة خط إشعار جديد" : "Add New Line"}
          </Button>

          <Button
            type="button"
            disabled={!canEdit || !dirty || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="rounded-xl h-11 px-8 bg-primary text-primary-foreground font-black text-xs shadow-md shadow-primary/25 hover:brightness-110 cursor-pointer"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Check className="h-4 w-4 me-2" />}
            {isRtl ? "حفظ التغييرات" : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// HELPER COMPONENTS
// -----------------------------------------------------------------------------

function InputField({
  label,
  required,
  icon: Icon,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5 text-primary/70 shrink-0" />}
          <span>{label}</span>
          {required && <span className="text-destructive">*</span>}
        </Label>
        {hint && <span className="text-[11px] text-muted-foreground font-medium">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

interface AssetUploadCardProps {
  /** Chip text; defaults to "Company Logo" / "Favicon". */
  badge?: string;
  /** Served from the public file route (logos). Other uploads load with the session. */
  isPublic?: boolean;
  title: string;
  subtitle: string;
  aspectHint: string;
  previewType: "logo" | "favicon";
  fileId?: string | null;
  module: string;
  onUploaded: (fileId: string) => void;
  onRemoved: () => void;
  disabled?: boolean;
  isRtl?: boolean;
}

export function AssetUploadCard({
  badge,
  isPublic = true,
  title,
  subtitle,
  aspectHint,
  previewType,
  fileId,
  module,
  onUploaded,
  onRemoved,
  disabled,
  isRtl,
}: AssetUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);
    setIsUploading(true);
    try {
      const uploaded = await filesApi.upload(file, module);
      onUploaded(uploaded.id);
      toast.success(isRtl ? "تم رفع الملف بنجاح" : "File uploaded successfully");
    } catch (err) {
      toast.error(getErrorMessage(err));
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemove() {
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
    onRemoved();
  }

  return (
    <div className="p-5 rounded-2xl border border-border/80 bg-card/60 space-y-4 transition-all">
      <input
        ref={inputRef}
        type="file"
        accept={previewType === "favicon" ? ".ico,.png" : ".png,.svg,.jpg,.jpeg"}
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files?.[0])}
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-black text-sm text-foreground">{title}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
          {badge ?? (previewType === "logo" ? (isRtl ? "شعار المنشأة" : "Company Logo") : "Favicon")}
        </Badge>
      </div>

      {fileId || localPreview ? (
        <div className="space-y-3">
          {/* Visual Live Preview Box */}
          {previewType === "logo" ? (
            <div className="relative flex items-center justify-center p-6 rounded-xl border border-border/70 bg-muted/40 dark:bg-muted/15 min-h-[140px] overflow-hidden group">
              {/* Subtle checkered background for transparent logos */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(#000 1px, transparent 1px), radial-gradient(#000 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 8px 8px",
                }}
              />
              <AuthedFileImage
                fileId={fileId}
                previewUrl={localPreview}
                isPublic={isPublic}
                alt="Corporate Logo"
                className="relative z-10 max-h-20 max-w-[200px] object-contain drop-shadow-sm transition-transform group-hover:scale-105"
              />
            </div>
          ) : (
            /* Simulated Safari/Chrome Browser Tab Preview */
            <div className="p-3 rounded-xl border border-border/70 bg-muted/40 dark:bg-muted/15 space-y-2">
              <span className="text-[11px] text-muted-foreground font-medium">
                {isRtl ? "معاينة علامة التبويب في المتصفح:" : "Browser tab mockup preview:"}
              </span>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/60 shadow-xs max-w-xs">
                <AuthedFileImage
                  fileId={fileId}
                  previewUrl={localPreview}
                  isPublic={true}
                  alt="Favicon"
                  className="h-4 w-4 rounded-xs object-contain"
                />
                <span className="text-xs font-bold text-foreground truncate">
                  {isRtl ? "نظام SanaD لإدارة الوثائق والموظفين" : "SanaD Documents & Licenses"}
                </span>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="h-4 w-4" />
              <span>{isRtl ? "أصل نشط ومحفوظ" : "Active & saved asset"}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isUploading}
                onClick={() => inputRef.current?.click()}
                className="h-8 rounded-lg text-xs font-bold cursor-pointer"
              >
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1" /> : null}
                {isRtl ? "استبدال" : "Replace"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={handleRemove}
                className="h-8 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 me-1" />
                {isRtl ? "حذف" : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Sleek Upload Dropzone */
        <div
          onClick={() => (!disabled && !isUploading ? inputRef.current?.click() : null)}
          className={cn(
            "flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-border/80 bg-muted/20 hover:bg-muted/40 transition-all text-center cursor-pointer group",
            disabled && "opacity-50 pointer-events-none"
          )}
        >
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
          </div>
          <span className="text-xs font-bold text-foreground">
            {isUploading
              ? (isRtl ? "جاري رفع الملف..." : "Uploading file...")
              : (isRtl ? "اضغط لاختيار الملف أو اسحبه هنا" : "Click to choose file or drag here")}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 font-medium">{aspectHint}</span>
        </div>
      )}
    </div>
  );
}

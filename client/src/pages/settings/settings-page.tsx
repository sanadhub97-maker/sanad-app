import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Mail, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/common/file-upload";
import { PageHeader } from "@/components/common/page-header";
import { settingsApi } from "@/api/settings";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";

export default function SettingsPage() {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canEdit = hasPermission("settings.edit");

  return (
    <div className="space-y-4">
      <PageHeader title={t("settings.title")} description={t("settings.subtitle")} />
      <Tabs defaultValue="company">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="company">{t("settings.tabs.company")}</TabsTrigger>
          <TabsTrigger value="appearance">{t("settings.tabs.appearance")}</TabsTrigger>
          <TabsTrigger value="expiration">{t("settings.tabs.expiration")}</TabsTrigger>
          <TabsTrigger value="email">{t("settings.tabs.email")}</TabsTrigger>
          <TabsTrigger value="whatsapp">{t("settings.tabs.whatsapp")}</TabsTrigger>
        </TabsList>
        <TabsContent value="company">
          <CompanyTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="expiration">
          <ExpirationTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="email">
          <EmailTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="whatsapp">
          <WhatsappTab canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CompanyTab({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings", "company"], queryFn: settingsApi.getCompany });
  const { register, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = useForm({ values: data ?? {} });

  const mutation = useMutation({
    mutationFn: settingsApi.updateCompany,
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["settings", "company"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.company.title")}</CardTitle>
        <CardDescription>{t("settings.company.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid gap-4 sm:grid-cols-2">
          <Field label={t("settings.company.nameAr")}><Input {...register("nameAr")} dir="rtl" /></Field>
          <Field label={t("settings.company.nameEn")}><Input {...register("nameEn")} /></Field>
          <Field label={t("settings.company.crNumber")}><Input {...register("crNumber")} /></Field>
          <Field label={t("settings.company.vatNumber")}><Input {...register("vatNumber")} /></Field>
          <Field label={t("settings.company.phone")}><Input {...register("phone")} /></Field>
          <Field label={t("settings.company.email")}><Input type="email" {...register("email")} /></Field>
          <Field label={t("settings.company.website")}><Input {...register("website")} /></Field>
          <Field label={t("settings.company.city")}><Input {...register("city")} /></Field>
          <Field label={t("settings.company.country")}><Input {...register("country")} /></Field>
          <Field label={t("settings.company.address")}><Input {...register("address")} /></Field>
          <Field label={t("settings.company.logo")}>
            <FileUpload
              fileId={watch("logoFileId")}
              module="company-logo"
              onUploaded={(fid) => setValue("logoFileId", fid)}
              onRemoved={() => setValue("logoFileId", undefined)}
            />
          </Field>
          <Field label={t("settings.company.favicon")}>
            <FileUpload
              fileId={watch("faviconFileId")}
              module="company-favicon"
              onUploaded={(fid) => setValue("faviconFileId", fid)}
              onRemoved={() => setValue("faviconFileId", undefined)}
            />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => reset()}>
              {t("common.reset")}
            </Button>
            <Button type="submit" disabled={!canEdit || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} {t("common.save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AppearanceTab({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings", "appearance"], queryFn: settingsApi.getAppearance });
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm({ values: data });

  const mutation = useMutation({
    mutationFn: settingsApi.updateAppearance,
    onSuccess: (res, variables) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["settings", "appearance"] });
      if (variables.themeMode) {
        useUiStore.getState().setThemeMode(variables.themeMode as "light" | "dark" | "system");
      }
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const colorFields: { key: "primaryColor" | "secondaryColor" | "accentColor" | "successColor" | "warningColor" | "dangerColor" | "infoColor"; label: string }[] = [
    { key: "primaryColor", label: t("settings.appearance.primary") },
    { key: "secondaryColor", label: t("settings.appearance.secondary") },
    { key: "accentColor", label: t("settings.appearance.accent") },
    { key: "successColor", label: t("settings.appearance.success") },
    { key: "warningColor", label: t("settings.appearance.warning") },
    { key: "dangerColor", label: t("settings.appearance.danger") },
    { key: "infoColor", label: t("settings.appearance.information") },
  ];

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.appearance.title")}</CardTitle>
        <CardDescription>{t("settings.appearance.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("settings.appearance.themeMode")}>
              <Controller control={control} name="themeMode" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t("settings.appearance.light")}</SelectItem>
                    <SelectItem value="dark">{t("settings.appearance.dark")}</SelectItem>
                    <SelectItem value="system">{t("settings.appearance.system")}</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </Field>
            <Field label={t("settings.appearance.sidebarStyle")}>
              <Controller control={control} name="sidebarStyle" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expanded">{t("settings.appearance.expanded")}</SelectItem>
                    <SelectItem value="collapsed">{t("settings.appearance.collapsed")}</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {colorFields.map((f) => (
              <Field key={f.key} label={f.label}>
                <Input type="color" className="h-10 p-1" {...register(f.key)} />
              </Field>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Controller control={control} name="animationsEnabled" render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )} />
            <Label>{t("settings.appearance.enableAnimations")}</Label>
          </div>
          <div className="flex items-center gap-3">
            <Controller control={control} name="compactMode" render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )} />
            <Label>{t("settings.appearance.compactMode")}</Label>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!canEdit || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} {t("common.save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ExpirationTab({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings", "expiration"], queryFn: settingsApi.getExpirationRules });
  const [thresholdDays, setThresholdDays] = useState(data?.expiringSoonThresholdDays ?? 30);
  const [notifyDays, setNotifyDays] = useState((data?.notifyDaysBefore ?? [90, 60, 30, 15, 7, 3, 1]).join(", "));

  const mutation = useMutation({
    mutationFn: settingsApi.updateExpirationRules,
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["settings", "expiration"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.expiration.title")}</CardTitle>
        <CardDescription>{t("settings.expiration.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label={t("settings.expiration.thresholdLabel")}>
          <Input type="number" value={thresholdDays} onChange={(e) => setThresholdDays(Number(e.target.value))} className="max-w-xs" />
        </Field>
        <Field label={t("settings.expiration.notifyLabel")}>
          <Input value={notifyDays} onChange={(e) => setNotifyDays(e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <Button
            disabled={!canEdit || mutation.isPending}
            onClick={() =>
              mutation.mutate({
                expiringSoonThresholdDays: thresholdDays,
                notifyDaysBefore: notifyDays.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n)),
              })
            }
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t("common.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmailTab({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings", "email"], queryFn: settingsApi.getEmail });
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm({ values: data });
  const [testTo, setTestTo] = useState("");

  const mutation = useMutation({
    mutationFn: settingsApi.updateEmail,
    onSuccess: (res) => {
      toast.success(res.message ?? t("common.savedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["settings", "email"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
  const testMutation = useMutation({
    mutationFn: () => settingsApi.testEmail(testTo),
    onSuccess: (res) => toast.success(res.message),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> {t("settings.email.title")}</CardTitle>
        <CardDescription>{t("settings.email.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="flex items-center gap-3">
            <Controller control={control} name="enabled" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
            <Label>{t("settings.email.enable")}</Label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("settings.email.host")}><Input {...register("host")} /></Field>
            <Field label={t("settings.email.port")}><Input type="number" {...register("port")} /></Field>
            <Field label={t("settings.email.username")}><Input {...register("username")} /></Field>
            <Field label={t("settings.email.password")}><Input type="password" placeholder={t("settings.email.passwordPlaceholder")} {...register("password" as never)} /></Field>
            <Field label={t("settings.email.fromName")}><Input {...register("fromName")} /></Field>
            <Field label={t("settings.email.fromEmail")}><Input type="email" {...register("fromEmail")} /></Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!canEdit || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} {t("common.save")}
            </Button>
          </div>
        </form>
        <div className="flex items-center gap-2 border-t border-border pt-4">
          <Input placeholder={t("settings.email.sendTestTo")} value={testTo} onChange={(e) => setTestTo(e.target.value)} className="max-w-xs" />
          <Button variant="outline" onClick={() => testMutation.mutate()} disabled={!testTo || testMutation.isPending}>
            <Send className="h-4 w-4" /> {t("common.sendTest")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WhatsappTab({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings", "whatsapp"], queryFn: settingsApi.getWhatsapp });
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm({ values: data });
  const [testTo, setTestTo] = useState("");

  const mutation = useMutation({
    mutationFn: settingsApi.updateWhatsapp,
    onSuccess: (res) => {
      toast.success(res.message ?? t("common.savedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["settings", "whatsapp"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
  const testMutation = useMutation({
    mutationFn: () => settingsApi.testWhatsapp(testTo),
    onSuccess: (res) => toast.success(res.message),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> {t("settings.whatsapp.title")}</CardTitle>
        <CardDescription>{t("settings.whatsapp.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="flex items-center gap-3">
            <Controller control={control} name="enabled" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
            <Label>{t("settings.whatsapp.enable")}</Label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("settings.whatsapp.provider")}><Input {...register("provider")} placeholder="Meta Cloud API" /></Field>
            <Field label={t("settings.whatsapp.apiUrl")}><Input {...register("apiUrl")} placeholder="https://graph.facebook.com/v20.0" /></Field>
            <Field label={t("settings.whatsapp.apiKey")}><Input type="password" placeholder={t("settings.whatsapp.apiKeyPlaceholder")} {...register("apiKey" as never)} /></Field>
            <Field label={t("settings.whatsapp.phoneNumberId")}><Input {...register("phoneNumberId")} /></Field>
            <Field label={t("settings.whatsapp.businessAccountId")}><Input {...register("businessAccountId")} /></Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!canEdit || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} {t("common.save")}
            </Button>
          </div>
        </form>
        <div className="flex items-center gap-2 border-t border-border pt-4">
          <Input placeholder={t("settings.whatsapp.sendTestTo")} value={testTo} onChange={(e) => setTestTo(e.target.value)} className="max-w-xs" />
          <Button variant="outline" onClick={() => testMutation.mutate()} disabled={!testTo || testMutation.isPending}>
            <Send className="h-4 w-4" /> {t("common.sendTest")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

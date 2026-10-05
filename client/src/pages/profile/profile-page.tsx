import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { changePassword, type AvatarUser } from "@/api/auth";
import { UserAvatar } from "@/components/lulu/user-avatar";
import { openAvatarEditor } from "@/components/lulu/avatar-editor";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { translateRoleName } from "@/lib/role-display";
import { tr } from "@/i18n";
import { PasskeysCard } from "./passkeys-card";
import { SessionsCard } from "./sessions-card";
import { Link } from "react-router-dom";

// Messages are picked when the error shows, so they follow a language switch.
const schema = z
  .object({ currentPassword: z.string().min(1), newPassword: z.string().min(12).max(72).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).refine((value) => new TextEncoder().encode(value).length <= 72), confirmPassword: z.string() })
  .superRefine((d, ctx) => {
    if (d.newPassword !== d.confirmPassword)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: tr("كلمتا المرور غير متطابقتين", "Passwords do not match") });
  });
type FormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const user = useAuthStore((s) => s.user);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (v: FormValues) => changePassword(v.currentPassword, v.newPassword),
    onSuccess: (res) => {
      toast.success(res.message);
      reset();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title={t("profile.title")} description={t("profile.subtitle")} />
      <PasskeysCard isAr={isAr} />
      <SessionsCard isAr={isAr} />
      <Link to="/maintenance" className="inline-block text-sm text-primary underline">{isAr ? "المحذوفات وسجل الوثائق والنسخ الاحتياطي" : "Recycle bin, document history and backups"}</Link>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.account")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="lu-ave-hero mb-2">
            <UserAvatar name={user?.fullName} fileId={(user as AvatarUser | null)?.avatarFileId} avatarKey={(user as AvatarUser | null)?.avatarKey} size={72} ring />
            <div className="min-w-0 flex-1">
              <b className="truncate">{user?.fullName}</b>
              <small>{isAr ? "صورتك تظهر في القائمة الجانبية والمهام وقائمة المستخدمين" : "Shown in the sidebar, tasks and the users list"}</small>
            </div>
            <Button type="button" variant="outline" onClick={openAvatarEditor}>
              <ImageUp className="h-4 w-4" /> {isAr ? "تغيير الصورة" : "Change picture"}
            </Button>
          </div>
          <p>
            <span className="text-muted-foreground">{t("profile.name")}: </span>
            {user?.fullName}
          </p>
          <p>
            <span className="text-muted-foreground">{t("profile.email")}: </span>
            {user?.email}
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {user?.roles.map((r) => (
              <Badge key={r} variant="secondary">
                {translateRoleName(r, t)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("auth.changePassword")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => mutation.isPending ? undefined : mutation.mutateAsync(v).catch(() => undefined))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("auth.currentPassword")}</Label>
              <Input type="password" {...register("currentPassword")} />
              {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t("auth.newPassword")}</Label>
              <Input type="password" {...register("newPassword")} />
              {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t("auth.confirmNewPassword")}</Label>
              <Input type="password" {...register("confirmPassword")} />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} {t("auth.updatePassword")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

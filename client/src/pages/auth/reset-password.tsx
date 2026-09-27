import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/api/auth";
import { getErrorMessage } from "@/lib/api";
import { tr } from "@/i18n";

const makeSchema = () =>
  z
    .object({
      password: z.string().min(8, tr("كلمة المرور يجب أن لا تقل عن 8 خانات", "Password must be at least 8 characters")),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: tr("كلمات المرور غير متطابقة", "Passwords do not match"),
      path: ["confirmPassword"],
    });

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

export default function ResetPasswordPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(useMemo(makeSchema, [isAr])) });

  async function onSubmit(values: FormValues) {
    try {
      const res = await resetPassword(token, values.password);
      toast.success(res.message);
      navigate("/login");
    } catch (err) {
      toast.error(
        getErrorMessage(err, isAr ? "رابط إعادة التعيين غير صالح أو منتهي الصلاحية." : "The reset link is invalid or has expired.")
      );
    }
  }

  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm font-semibold text-destructive">{t("auth.missingResetToken")}</p>
        <Link to="/login" className="inline-block text-xs font-bold text-primary hover:underline">
          {t("auth.backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-start">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            {isAr ? "تعيين كلمة المرور" : "Set New Password"}
          </p>
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold font-head tracking-tight text-foreground font-sans">
          {t("auth.resetTitle")}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-normal">
          {isAr
            ? "أدخل كلمة المرور الجديدة لحسابك لتأكيد التحديث"
            : "Enter your new strong password to secure your account"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-bold text-foreground/80">
            {t("auth.newPassword")}
          </Label>
          <div className="relative group">
            <Lock className="absolute start-3.5 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
            <Input
              id="password"
              type={showPass ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••••••"
              className="ps-10 pe-10 h-12 rounded-2xl border border-input bg-card focus:border-primary text-foreground placeholder:text-muted-foreground/70 text-sm font-medium transition-all font-mono"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute end-3.5 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs font-medium text-destructive">{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs font-bold text-foreground/80">
            {t("auth.confirmNewPassword")}
          </Label>
          <div className="relative group">
            <Lock className="absolute start-3.5 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••••••"
              className="ps-10 pe-10 h-12 rounded-2xl border border-input bg-card focus:border-primary text-foreground placeholder:text-muted-foreground/70 text-sm font-medium transition-all font-mono"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute end-3.5 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs font-medium text-destructive">{errors.confirmPassword.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 text-sm tracking-wide mt-2"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{isAr ? "جاري التحديث..." : "Updating..."}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>{t("auth.resetPassword")}</span>
              <ArrowIcon className="h-4 w-4" />
            </div>
          )}
        </Button>
      </form>

      <div className="text-center pt-2">
        <Link
          to="/login"
          className="text-xs font-semibold text-primary hover:text-primary/80 hover:underline transition-colors"
        >
          {t("auth.backToSignIn")}
        </Link>
      </div>
    </div>
  );
}

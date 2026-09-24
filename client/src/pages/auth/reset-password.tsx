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
        <p className="text-sm font-semibold text-rose-400">{t("auth.missingResetToken")}</p>
        <Link to="/login" className="inline-block text-xs font-bold text-cyan-400 hover:underline">
          {t("auth.backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-start">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
            {isAr ? "تعيين كلمة المرور" : "Set New Password"}
          </p>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
          {t("auth.resetTitle")}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
          {isAr
            ? "أدخل كلمة المرور الجديدة لحسابك لتأكيد التحديث"
            : "Enter your new strong password to secure your account"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-bold text-slate-300">
            {t("auth.newPassword")}
          </Label>
          <div className="relative group">
            <Lock className="absolute start-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-cyan-400 transition-colors pointer-events-none" />
            <Input
              id="password"
              type={showPass ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••••••"
              className="ps-10 pe-10 h-12 rounded-xl border border-white/10 bg-black/40 hover:border-white/20 focus:border-cyan-400 focus:bg-black/50 text-white placeholder:text-slate-500 text-sm font-medium transition-all shadow-inner font-mono"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute end-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs font-medium text-rose-400">{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-300">
            {t("auth.confirmNewPassword")}
          </Label>
          <div className="relative group">
            <Lock className="absolute start-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-cyan-400 transition-colors pointer-events-none" />
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••••••"
              className="ps-10 pe-10 h-12 rounded-xl border border-white/10 bg-black/40 hover:border-white/20 focus:border-cyan-400 focus:bg-black/50 text-white placeholder:text-slate-500 text-sm font-medium transition-all shadow-inner font-mono"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute end-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs font-medium text-rose-400">{errors.confirmPassword.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold shadow-[0_4px_25px_-4px_rgba(56,189,248,0.45)] hover:shadow-[0_8px_35px_-4px_rgba(56,189,248,0.65)] hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 text-sm tracking-wide specular-border mt-2"
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
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
        >
          {t("auth.backToSignIn")}
        </Link>
      </div>
    </div>
  );
}

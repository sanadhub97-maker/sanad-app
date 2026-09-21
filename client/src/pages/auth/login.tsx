import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Lock, Mail, ArrowRight, ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { login } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { getErrorMessage } from "@/lib/api";

const schema = z.object({
  email: z.string().email("صيغة البريد الإلكتروني غير صحيحة"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
  rememberMe: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rememberMe: false },
  });

  async function onSubmit(values: FormValues) {
    try {
      const result = await login(values);
      setAuth(result.accessToken, result.user);
      const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
      navigate(from, { replace: true });
      toast.success(isAr ? `أهلاً بك مجدداً، ${result.user.fullName}` : `Welcome back, ${result.user.fullName}`);
    } catch (err) {
      toast.error(getErrorMessage(err, isAr ? "البريد الإلكتروني أو كلمة المرور غير صحيحة." : "Invalid email or password."));
    }
  }

  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6 text-start">
      {/* Header section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
            {isAr ? "بوابة الدخول الموحدة" : "Secure Single Sign-On"}
          </p>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
          {t("auth.loginTitle")}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
          {isAr
            ? "أدخل بياناتك للمتابعة إلى مركز القيادة وإدارة العمليات"
            : "Enter your enterprise credentials to access the command center"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
        {/* Email Field */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-bold text-slate-300">
            {t("auth.email")}
          </Label>
          <div className="relative group">
            <Mail className="absolute start-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-cyan-400 transition-colors pointer-events-none" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@sanad.sa"
              className="ps-10 h-12 rounded-xl border border-white/10 bg-black/40 hover:border-white/20 focus:border-cyan-400 focus:bg-black/50 text-white placeholder:text-slate-500 text-sm font-medium transition-all shadow-inner"
              {...register("email")}
            />
          </div>
          {errors.email && <p className="text-xs font-medium text-rose-400">{errors.email.message}</p>}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-bold text-slate-300">
              {t("auth.password")}
            </Label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
            >
              {t("auth.forgotPassword")}
            </Link>
          </div>
          <div className="relative group">
            <Lock className="absolute start-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-cyan-400 transition-colors pointer-events-none" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••••"
              className="ps-10 pe-10 h-12 rounded-xl border border-white/10 bg-black/40 hover:border-white/20 focus:border-cyan-400 focus:bg-black/50 text-white placeholder:text-slate-500 text-sm font-medium transition-all shadow-inner font-mono"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute end-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs font-medium text-rose-400">{errors.password.message}</p>}
        </div>

        {/* Remember Me */}
        <div className="flex items-center gap-2.5 pt-1">
          <Checkbox
            id="rememberMe"
            checked={watch("rememberMe")}
            onCheckedChange={(v) => setValue("rememberMe", Boolean(v))}
            className="rounded-md border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
          />
          <Label htmlFor="rememberMe" className="text-xs font-medium text-slate-300 cursor-pointer select-none">
            {t("auth.rememberMe")}
          </Label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold shadow-[0_4px_25px_-4px_rgba(56,189,248,0.45)] hover:shadow-[0_8px_35px_-4px_rgba(56,189,248,0.65)] hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 text-sm tracking-wide specular-border mt-2"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{isAr ? "جاري التحقق والاتصال..." : "Authenticating..."}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>{t("auth.signIn")}</span>
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          )}
        </Button>
      </form>

      {/* Security Note Footnote */}
      <div className="pt-2 text-center">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>{isAr ? "اتصال مشفر ومحمي بأحدث معايير الأمان المؤسسي" : "Protected by bank-grade TLS encryption"}</span>
        </p>
      </div>
    </div>
  );
}

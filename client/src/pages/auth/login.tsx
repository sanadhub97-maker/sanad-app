import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Lock, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { login } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { getErrorMessage } from "@/lib/api";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { rememberMe: false } });

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
    <div className="space-y-6">
      <div className="space-y-1.5 text-start">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-sans">
          {t("auth.loginTitle")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {isAr
            ? "أدخل بياناتك للمتابعة إلى لوحة التحكم والعمليات"
            : "Enter your credentials to access your executive workspace"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5 text-start">
          <Label htmlFor="email" className="text-xs font-semibold">
            {t("auth.email")}
          </Label>
          <div className="relative">
            <Mail className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@sanad.sa"
              className="ps-9 h-10 rounded-xl border-border/70 bg-card shadow-sm focus-visible:ring-primary/20"
              {...register("email")}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5 text-start">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold">
              {t("auth.password")}
            </Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              {t("auth.forgotPassword")}
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="ps-9 h-10 rounded-xl border-border/70 bg-card shadow-sm focus-visible:ring-primary/20"
              {...register("password")}
            />
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="rememberMe"
            checked={watch("rememberMe")}
            onCheckedChange={(v) => setValue("rememberMe", Boolean(v))}
            className="rounded-md"
          />
          <Label htmlFor="rememberMe" className="text-xs font-normal text-muted-foreground cursor-pointer select-none">
            {t("auth.rememberMe")}
          </Label>
        </div>

        <Button
          type="submit"
          className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:brightness-105 transition-all text-sm"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              <span>{t("auth.signIn")}</span>
              <ArrowIcon className="h-4 w-4" />
            </div>
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          {t("auth.register")}
        </Link>
      </p>
    </div>
  );
}


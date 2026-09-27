import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "@/api/auth";
import { getErrorMessage } from "@/lib/api";
import { tr } from "@/i18n";

const makeSchema = () =>
  z.object({ email: z.string().email(tr("صيغة البريد الإلكتروني غير صحيحة", "Invalid email address")) });
type FormValues = z.infer<ReturnType<typeof makeSchema>>;

export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(useMemo(makeSchema, [isAr])) });

  async function onSubmit(values: FormValues) {
    try {
      const res = await forgotPassword(values.email);
      toast.success(res.message);
      setSent(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  if (sent) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success border border-success/30">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold font-head text-foreground font-sans">{t("auth.checkEmailTitle")}</h2>
          <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed max-w-sm mx-auto">{t("auth.checkEmailBody")}</p>
        </div>
        <div className="pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-xs font-bold text-foreground hover:bg-accent transition-all"
          >
            <ArrowIcon className="h-4 w-4" />
            <span>{t("auth.backToSignIn")}</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-start">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            {isAr ? "استعادة الحساب" : "Account Recovery"}
          </p>
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold font-head tracking-tight text-foreground font-sans">
          {t("auth.forgotTitle")}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-normal">
          {isAr
            ? "أدخل بريدك الإلكتروني المسجل لإرسال رابط إعادة تعيين كلمة المرور"
            : "Enter your registered email to receive a password reset link"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-bold text-foreground/80">
            {t("auth.email")}
          </Label>
          <div className="relative group">
            <Mail className="absolute start-3.5 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@sanad.sa"
              className="ps-10 h-12 rounded-2xl border border-input bg-card focus:border-primary text-foreground placeholder:text-muted-foreground/70 text-sm font-medium transition-all"
              {...register("email")}
            />
          </div>
          {errors.email && <p className="text-xs font-medium text-destructive">{errors.email.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 text-sm tracking-wide mt-2"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{isAr ? "جاري الإرسال..." : "Sending..."}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>{t("auth.sendResetLink")}</span>
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

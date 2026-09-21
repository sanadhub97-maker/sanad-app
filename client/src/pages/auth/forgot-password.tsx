import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "@/api/auth";
import { getErrorMessage } from "@/lib/api";
import { useState } from "react";

const schema = z.object({ email: z.string().email() });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      const res = await forgotPassword(values.email);
      toast.success(res.message);
      setSent(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">{t("auth.checkEmailTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("auth.checkEmailBody")}</p>
        <Link to="/login" className="text-accent hover:underline text-sm">
          {t("auth.backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("auth.forgotTitle")}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("auth.sendResetLink")}
        </Button>
      </form>
      <p className="text-center text-sm">
        <Link to="/login" className="text-accent hover:underline">
          {t("auth.backToSignIn")}
        </Link>
      </p>
    </div>
  );
}

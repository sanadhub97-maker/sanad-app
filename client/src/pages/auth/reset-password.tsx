import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/api/auth";
import { getErrorMessage } from "@/lib/api";

const schema = z
  .object({ password: z.string().min(8, "At least 8 characters"), confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      const res = await resetPassword(token, values.password);
      toast.success(res.message);
      navigate("/login");
    } catch (err) {
      toast.error(getErrorMessage(err, "This reset link is invalid or has expired."));
    }
  }

  if (!token) {
    return <p className="text-sm text-destructive">{t("auth.missingResetToken")}</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("auth.resetTitle")}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("auth.newPassword")}</Label>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">{t("auth.confirmNewPassword")}</Label>
          <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("auth.resetPassword")}
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

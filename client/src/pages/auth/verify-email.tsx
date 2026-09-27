import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, CheckCircle2, XCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { verifyEmail } from "@/api/auth";
import { getErrorMessage } from "@/lib/api";

export default function VerifyEmailPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(isAr ? "رمز التحقق مفقود أو غير صالح." : "The verification token is missing or invalid.");
      return;
    }
    verifyEmail(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          getErrorMessage(err, isAr ? "رابط التحقق غير صالح أو قد انتهت صلاحيته." : "The verification link is invalid or has expired.")
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- verify once per token, not again on a language switch
  }, [token]);

  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-5 text-center">
      {status === "loading" && (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary border border-primary/30">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      )}
      {status === "success" && (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success border border-success/30">
          <CheckCircle2 className="h-7 w-7" />
        </div>
      )}
      {status === "error" && (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/30">
          <XCircle className="h-7 w-7" />
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-semibold font-head text-foreground font-sans">
          {status === "loading" ? t("auth.verifyTitle") : message}
        </h2>
      </div>

      {status !== "loading" && (
        <div className="pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-xs font-bold text-foreground hover:bg-accent transition-all"
          >
            <ArrowIcon className="h-4 w-4" />
            <span>{t("auth.backToSignIn")}</span>
          </Link>
        </div>
      )}
    </div>
  );
}

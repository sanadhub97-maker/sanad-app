import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { verifyEmail } from "@/api/auth";
import { getErrorMessage } from "@/lib/api";

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    verifyEmail(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(getErrorMessage(err, "This verification link is invalid or has expired."));
      });
  }, [token]);

  return (
    <div className="space-y-4 text-center">
      {status === "loading" && <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />}
      {status === "success" && <CheckCircle2 className="mx-auto h-10 w-10 text-success" />}
      {status === "error" && <XCircle className="mx-auto h-10 w-10 text-destructive" />}
      <h1 className="text-xl font-semibold">{status === "loading" ? t("auth.verifyTitle") : message}</h1>
      {status !== "loading" && (
        <Link to="/login" className="text-accent hover:underline text-sm">
          {t("auth.backToSignIn")}
        </Link>
      )}
    </div>
  );
}

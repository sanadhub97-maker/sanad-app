import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard";
import { login } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { getErrorMessage } from "@/lib/api";
import { tr } from "@/i18n";
import { cn } from "@/lib/utils";

const makeSchema = () =>
  z.object({
    email: z.string().min(1, tr("اكتب بريدك الإلكتروني", "Enter your email")).email(tr("صيغة البريد الإلكتروني غير صحيحة", "Invalid email address")),
    password: z.string().min(1, tr("اكتب كلمة المرور", "Enter your password")),
    rememberMe: z.boolean().default(true),
  });

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

/** The home page's code and first data, fetched while the gate opens. */
function prefetchHome(queryClient: QueryClient) {
  void import("@/pages/dashboard/dashboard-lulu");
  void queryClient.prefetchQuery({ queryKey: ["dashboard", "summary"], queryFn: dashboardApi.summary });
  void queryClient.prefetchQuery({ queryKey: ["dashboard", "overview"], queryFn: dashboardApi.overview });
  void queryClient.prefetchQuery({ queryKey: ["dashboard", "charts"], queryFn: dashboardApi.charts });
}

const Svg = ({ d, w = 2 }: { d: string; w?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const I = {
  mail: "M4 4h16v16H4zM4 6l8 7 8-7",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeOff: "M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.2A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.8M6.1 6.1A17 17 0 0 0 2 12s4 7 10 7a10 10 0 0 0 4-.8",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
  warn: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  caps: "M12 4 4 12h4v6h8v-6h4z",
  check: "M5 12l5 5L20 7",
  arrow: "M19 12H5M11 6l-6 6 6 6",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
};

/** Sign in, in the Royal design: floating labels, a Caps Lock warning, the
 * button sweeping while it checks, and a welcome once it succeeds. */
export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();
  // The home page's code downloads while you type.
  useEffect(() => {
    const id = window.setTimeout(() => void import("@/pages/dashboard/dashboard-lulu"), 1200);
    return () => window.clearTimeout(id);
  }, []);
  const root = useRef<HTMLDivElement>(null);

  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(useMemo(makeSchema, [isAr])),
    defaultValues: { rememberMe: true, email: "", password: "" },
  });
  const remember = watch("rememberMe");

  function shake() {
    const p = root.current?.querySelector(".ry-form");
    if (!p) return;
    p.classList.remove("shake");
    void (p as HTMLElement).offsetWidth;
    p.classList.add("shake");
  }

  async function onSubmit(values: FormValues) {
    setFailure(null);
    try {
      const result = await login(values);
      setWelcome(true);
      const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
      // Signed in at once, so the home page's data loads while the gate opens.
      setAuth(result.accessToken, result.user);
      if (from === "/") prefetchHome(queryClient);
      setTimeout(() => navigate(from, { replace: true }), 900);
    } catch (err) {
      setFailure(getErrorMessage(err, isAr ? "البريد الإلكتروني أو كلمة المرور غير صحيحة." : "Invalid email or password."));
      shake();
    }
  }

  const passField = register("password");
  const emailField = register("email");

  return (
    <div ref={root}>
      <form className="ry-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <h1>{isAr ? "مرحبًا بعودتك" : "Welcome back"}</h1>
        <p className="sub">{isAr ? "سجّل دخولك لمتابعة موظفيك ووثائق شركتك." : "Sign in to follow your people and your company's documents."}</p>
        {failure && (
          <div className="ry-alert" role="alert">
            <Svg d={I.warn} />
            {failure}
          </div>
        )}
        <div>
          <label className={cn("ry-fl", errors.email && "bad")}>
            <input
              id="email"
              type="email"
              placeholder=" "
              autoComplete="email"
              dir="ltr"
              {...emailField}
              onChange={(e) => {
                setFailure(null);
                emailField.onChange(e);
              }}
            />
            <span>{t("auth.email")}</span>
            <Svg d={I.mail} />
          </label>
          {errors.email && <div className="ry-ferr">{errors.email.message}</div>}
        </div>
        <div>
          <label className={cn("ry-fl", errors.password && "bad")}>
            <input
              id="password"
              type={show ? "text" : "password"}
              placeholder=" "
              autoComplete="current-password"
              dir="ltr"
              {...passField}
              onChange={(e) => {
                setFailure(null);
                passField.onChange(e);
              }}
              onKeyDown={(e) => setCaps(e.getModifierState?.("CapsLock") ?? false)}
              onKeyUp={(e) => setCaps(e.getModifierState?.("CapsLock") ?? false)}
              onBlur={(e) => {
                setCaps(false);
                passField.onBlur(e);
              }}
            />
            <span>{t("auth.password")}</span>
            <Svg d={I.lock} />
            <button type="button" className="eye" onClick={() => setShow((s) => !s)} aria-label={show ? (isAr ? "إخفاء كلمة المرور" : "Hide password") : isAr ? "إظهار كلمة المرور" : "Show password"}>
              <Svg d={show ? I.eyeOff : I.eye} />
            </button>
          </label>
          {errors.password && <div className="ry-ferr">{errors.password.message}</div>}
          {caps && (
            <div className="ry-caps">
              <Svg d={I.caps} w={2.2} />
              {isAr ? "زر الأحرف الكبيرة (Caps Lock) مفعّل" : "Caps Lock is on"}
            </div>
          )}
        </div>
        <div className="ry-row">
          <label className="ry-check">
            <input type="checkbox" checked={!!remember} onChange={(e) => setValue("rememberMe", e.target.checked)} />
            {t("auth.rememberMe")}
          </label>
          <Link to="/forgot-password">{t("auth.forgotPassword")}</Link>
        </div>
        <button type="submit" className={cn("ry-go", (isSubmitting || welcome) && "busy")} disabled={isSubmitting || welcome}>
          <span>{isSubmitting ? (isAr ? "جاري الدخول…" : "Signing in…") : t("auth.signIn")}</span>
          <Svg d={I.arrow} w={2.4} />
        </button>
        <div className="ry-safe">
          <Svg d={I.shield} />
          {isAr ? "اتصال مشفّر · بياناتك محمية" : "Encrypted connection · your data is protected"}
        </div>
      </form>

      {createPortal(
        <div className={cn("ry-welcome-over", welcome && "on")} aria-live="polite">
          <div className="in">
            <img src="/brand/sanad-mark.webp" alt="" />
            <h2>{isAr ? "أهلًا بعودتك" : "Welcome back"}</h2>
            <p>{isAr ? "نجهّز لك لوحة التحكم…" : "Getting your dashboard ready…"}</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

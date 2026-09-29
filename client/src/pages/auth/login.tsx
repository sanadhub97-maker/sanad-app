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
import { useGate } from "@/layouts/gate-layout";
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

/** Sign in, in the SanaD gate: floating labels, the first letter of the email
 * in a bubble, a Caps Lock warning, the button filling while it checks, and
 * the gate opening onto a welcome once it succeeds. */
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
  const { night } = useGate();
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
  const email = watch("email") ?? "";
  const remember = watch("rememberMe");
  const hour = new Date().getHours();
  const greeting = isAr ? (hour < 12 ? "صباح الخير" : "مساء الخير") : hour < 12 ? "Good morning" : "Good evening";

  function shake() {
    const p = root.current?.closest(".g-panel");
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
      <div className="g-row1">
        <span className="g-pill">
          <span className="live" />
          {isAr ? "النظام متصل" : "System online"}
        </span>
        <button type="button" className="g-pill" onClick={() => i18n.changeLanguage(isAr ? "en" : "ar")}>
          <Svg d={I.globe} />
          <span>{isAr ? "English" : "العربية"}</span>
        </button>
      </div>
      <div className="g-mark">
        <img src="/brand/sanad-mark.webp" alt="" />
        <div>
          <b>SanaD HR</b>
          <small>People · Process · Progress</small>
        </div>
      </div>
      <div className="g-hello">
        <span className={cn("g-who", email.indexOf("@") > 0 && "on")} aria-hidden="true">
          {email.trim().charAt(0).toUpperCase()}
        </span>
        <h2>
          {greeting}{" "}
          <span className="wave" aria-hidden="true">
            👋
          </span>
        </h2>
      </div>
      <p className="g-sub">
        {isAr ? (
          <>
            سجّل دخولك إلى <b>SanaD</b> لمتابعة موظفيك ووثائقك.
          </>
        ) : (
          <>
            Sign in to <b>SanaD</b> to follow your people and documents.
          </>
        )}
      </p>
      {failure && (
        <div className="g-alert" role="alert">
          <Svg d={I.warn} />
          {failure}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={cn("g-f", errors.email && "bad")}>
          <div className="g-box">
            <span className="ic">
              <Svg d={I.mail} />
            </span>
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
            <label htmlFor="email">{t("auth.email")}</label>
          </div>
          {errors.email && <div className="g-err">{errors.email.message}</div>}
        </div>
        <div className={cn("g-f", errors.password && "bad")}>
          <div className="g-box">
            <span className="ic">
              <Svg d={I.lock} />
            </span>
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
            <label htmlFor="password">{t("auth.password")}</label>
            <button type="button" className="g-eye" onClick={() => setShow((s) => !s)} aria-label={show ? (isAr ? "إخفاء كلمة المرور" : "Hide password") : isAr ? "إظهار كلمة المرور" : "Show password"}>
              <Svg d={show ? I.eyeOff : I.eye} />
            </button>
          </div>
          {errors.password && <div className="g-err">{errors.password.message}</div>}
          {caps && (
            <div className="g-caps">
              <Svg d={I.caps} w={2.2} />
              {isAr ? "زر الأحرف الكبيرة (Caps Lock) مفعّل" : "Caps Lock is on"}
            </div>
          )}
        </div>
        <div className="g-opts">
          <button type="button" className="g-rem" role="checkbox" aria-checked={remember} onClick={() => setValue("rememberMe", !remember)}>
            <span className={cn("g-check", remember && "on")}>
              <Svg d={I.check} w={3.4} />
            </span>
            {t("auth.rememberMe")}
          </button>
          <Link to="/forgot-password" className="g-forgot">
            {t("auth.forgotPassword")}
          </Link>
        </div>
        <button type="submit" className={cn("g-go", isSubmitting && "busy")} disabled={isSubmitting || welcome}>
          <span className="fill" />
          {isSubmitting ? (
            <span className="spin" />
          ) : (
            <>
              <span className="lbl">{t("auth.signIn")}</span>
              <span className="arrow">
                <Svg d={I.arrow} w={2.4} />
              </span>
            </>
          )}
        </button>
      </form>
      <div className="g-safe">
        <Svg d={I.shield} />
        {isAr ? "اتصال مشفّر · بياناتك محمية" : "Encrypted connection · your data is protected"}
      </div>
      <div className="g-foot">© {new Date().getFullYear()} SanaD HR</div>

      {createPortal(
        <div className={cn("g-app g-portal", night && "night", welcome && "on")} aria-live="polite">
          <div className="in">
            <img src="/brand/sanad-logo.webp" alt="" />
            <h2>{isAr ? "أهلًا بعودتك" : "Welcome back"}</h2>
            <p>{isAr ? "نجهّز لك يومك في SanaD…" : "Getting your day ready in SanaD…"}</p>
            <div className="g-dots">
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

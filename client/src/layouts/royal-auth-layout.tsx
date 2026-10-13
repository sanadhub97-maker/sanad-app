import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { RouteProgressBar } from "@/components/layout/route-progress-bar";
import { Medal } from "@/components/royal/royale-fx";

/* The sign-in pages in the Royale design: the form on the dark side, and on
   the other the engraved gold medallion turning slowly, with what SanaD does. */
export function RoyalAuthLayout() {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const location = useLocation();

  return (
    <div className="ry-auth">
      <RouteProgressBar />
      <section className="ry-lf">
        <div className="ry-brandrow">
          <div className="ry-brand">
            <img src="/brand/sanad-mark.webp" alt="" />
            <div>
              <b>SanaD</b>
              <small>{isAr ? "الموارد البشرية والوثائق" : "People and documents"}</small>
            </div>
          </div>
          <button type="button" className="ry-langbtn" onClick={() => i18n.changeLanguage(isAr ? "en" : "ar")}>
            <Globe /> {isAr ? "English" : "العربية"}
          </button>
        </div>
        <div className="ry-lbody">
          <div key={location.pathname} className="lu-page">
            <Outlet />
          </div>
        </div>
        <div className="ry-lfoot">
          <span>© {new Date().getFullYear()} SanaD HR</span>
          <span>{isAr ? "اتصال مشفّر · بياناتك محمية" : "Encrypted connection · your data is protected"}</span>
        </div>
      </section>
      <section className="ry-la rx-la" aria-hidden="true">
        <Medal big>
          <img src="/brand/sanad-mark.webp" alt="SanaD" className="rx-medal-logo" />
        </Medal>
        <div className="ry-copy">
          <h2>{isAr ? "كل وثيقة في مكانها وفي ميعادها" : "Every document in its place, on time"}</h2>
          <p>{isAr ? "تنبيه قبل انتهاء الإقامات والرخص والشهادات، ومدفوعات مرتبة، وتقارير بهوية شركتك جاهزة للطباعة." : "A heads-up before iqamas, licences and certificates end, sorted payments, and print-ready reports with your branding."}</p>
        </div>
      </section>
    </div>
  );
}
